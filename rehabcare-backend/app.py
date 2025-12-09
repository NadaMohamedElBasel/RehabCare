# app.py
import bcrypt
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
CORS(app)

# Database connection
DB_CONFIG = {
    "dbname": "rehabcare_db",
    "user": "postgres",
    "password": "abcde", 
    "host": "localhost",
    "port": "5432"
}

def getDbConnection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        raise Exception(f"Database connection failed: {str(e)}")

# Patient Registration
@app.route('/api/register', methods=['POST'])
def registerPatient():
    try:
        data = request.get_json()
        firstName = data.get('firstName')
        lastName = data.get('lastName')
        email = data.get('email')
        password = data.get('password')
        dateOfBirth = data.get('dateOfBirth')
        phoneNumber = data.get('phoneNumber')
        gender = data.get('gender')

        if not all([firstName, lastName, email, password]):
            return jsonify({"error": "Missing required fields"}), 400

        #passwordHash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        passwordHash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
            INSERT INTO patients (first_name, last_name, email, password_hash, date_of_birth, phone_number, gender)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING patient_id
            """,
            (firstName, lastName, email, passwordHash, dateOfBirth, phoneNumber, gender)
        )
        patient = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"patientId": patient['patient_id'], "message": "Registration successful"}), 201

    except Exception as e:
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500


# Patient Login
@app.route('/api/login', methods=['POST'])
def login():
    logging.debug("Login attempt received")
    conn = None
    cursor = None
    try:
        data = request.get_json() or {}
        email = data.get('email')
        password = data.get('password')

        if not all([email, password]):
            return jsonify({"error": "Missing email or password"}), 400

        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            "SELECT patient_id, password_hash FROM patients WHERE email = %s",
            (email,)
        )
        patient = cursor.fetchone()

        if not patient:
            return jsonify({"error": "Invalid email or password"}), 401

        stored_password_hash = patient['password_hash'].encode('utf-8')

        if bcrypt.checkpw(password.encode('utf-8'), stored_password_hash):
            return jsonify({
                "patientId": patient['patient_id'],
                "message": "Login successful"
            }), 200
        else:
            return jsonify({"error": "Invalid email or password"}), 401

    except Exception as e:
        logging.error(f"Login error: {str(e)}")
        return jsonify({"error": "Login failed"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Patient Profile Management
@app.route('/api/patients/<int:patientId>', methods=['GET', 'PUT'])
# def managePatientProfile(patientId):
#     try:
#         conn = getDbConnection()
#         cursor = conn.cursor(cursor_factory=RealDictCursor)

#         if request.method == 'GET':
#             cursor.execute(
#                 "SELECT patient_id, first_name, last_name, email, TO_CHAR(date_of_birth, 'YYYY-MM-DD') as date_of_birth FROM patients WHERE patient_id = %s",
#                 (patientId,)
#             )
#             patient = cursor.fetchone()
#             print("Debug - Fetched patient data:", patient)  # Debug log
#             if not patient:
#                 return jsonify({"error": "Patient not found"}), 404
#             return jsonify(patient), 200

#         elif request.method == 'PUT':
#             data = request.get_json()
#             firstName = data.get('firstName')
#             lastName = data.get('lastName')
#             email = data.get('email')
#             dateOfBirth = data.get('dateOfBirth')
#             cursor.execute(
#                 """
#                 UPDATE patients
#                 SET first_name = %s, last_name = %s, email = %s, date_of_birth = %s
#                 WHERE patient_id = %s
#                 RETURNING patient_id, first_name, last_name, email, date_of_birth
#                 """,
#                 (firstName, lastName, email, dateOfBirth, patientId)
#             )
#             patient = cursor.fetchone()
#             conn.commit()
#             if not patient:
#                 return jsonify({"error": "Patient not found"}), 404
#             return jsonify(patient), 200

#     except Exception as e:
#         return jsonify({"error": f"Profile management failed: {str(e)}"}), 500
#     finally:
#         cursor.close()
#         conn.close()

def managePatientProfile(patientId):
    conn = None
    cursor = None
    try:
        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        if request.method == 'GET':
            cursor.execute("""
                SELECT patient_id, first_name, last_name, email,
                       TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS date_of_birth , phone_number, gender
                FROM patients
                WHERE patient_id = %s
            """, (patientId,))
            patient = cursor.fetchone()
            if not patient:
                return jsonify({"error": "Patient not found"}), 404
            return jsonify(patient), 200

        if request.method == 'PUT':
            data = request.get_json() or {}
            # Accept either snake_case (first_name) or camelCase (firstName)
            first_name = data.get('first_name') or data.get('firstName')
            last_name = data.get('last_name') or data.get('lastName')
            email = data.get('email')
            date_of_birth = data.get('date_of_birth') or data.get('dateOfBirth')
            phone_number = data.get('phone_number') or data.get('phoneNumber')
            gender = data.get('gender')

            # Build dynamic update
            fields = []
            values = []
            if first_name is not None:
                fields.append('first_name = %s'); values.append(first_name)
            if last_name is not None:
                fields.append('last_name = %s'); values.append(last_name)
            if email is not None:
                fields.append('email = %s'); values.append(email)
            if date_of_birth is not None:
                # accept empty string or null -> set NULL
                if date_of_birth == '':
                    fields.append('date_of_birth = NULL')
                else:
                    fields.append('date_of_birth = %s'); values.append(date_of_birth)
            if phone_number is not None:
                fields.append('phone_number = %s'); values.append(phone_number)
            if gender is not None:
                fields.append('gender = %s'); values.append(gender)

            if not fields:
                return jsonify({"error": "No fields to update"}), 400

            values.append(patientId)
            sql = f"UPDATE patients SET {', '.join(fields)} WHERE patient_id = %s RETURNING patient_id, first_name, last_name, email, TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS date_of_birth, phone_number, gender"
            cursor.execute(sql, tuple(values))
            updated = cursor.fetchone()
            conn.commit()
            if not updated:
                return jsonify({"error": "Update failed"}), 500
            return jsonify(updated), 200

    except Exception as e:
        logging.exception("Patient profile error")
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Appointment Scheduling
# app.py

# ... (Place this function right after def getDbConnection():)
# ----------------------------------------------------------------------
def checkAppointmentConflict(conn, doctor_id, start_time_str, end_time_str, exclude_appointment_id=None):
    """
    Checks for overlapping appointments for a specific doctor.
    Uses the correct SQL overlap logic: (Existing Start < New End) AND (New Start < Existing End)
    """
    cursor = None
    try:
        cursor = conn.cursor()

        query = """
            SELECT appointment_id
            FROM appointments
            WHERE doctor_id = %s
            AND status = 'Scheduled'
            AND (appointment_start_date < %s AND %s < appointment_end_date)
        """
        # Parameter order is crucial: [doctor_id, New End, New Start]
        params = [doctor_id, end_time_str, start_time_str]

        # Append condition to exclude the current appointment ID during an edit (PUT)
        if exclude_appointment_id:
            query += " AND appointment_id != %s"
            params.append(exclude_appointment_id)

        # NOTE: psycopg2 automatically handles casting the ISO string to timestamp
        cursor.execute(query, tuple(params))

        # Returns True if a conflict is found, False otherwise
        return cursor.fetchone() is not None
    except Exception as e:
        logging.exception("Error checking appointment conflict. Check date/time format compatibility.")
        return False
    finally:
        if cursor:
            cursor.close()


# ----------------------------------------------------------------------
# Appointment CRUD Endpoints
# ----------------------------------------------------------------------

@app.route('/api/appointments', methods=['POST', 'GET'])
@app.route('/api/appointments/<int:appointmentId>', methods=['GET'])
@app.route('/api/appointments/patient/<int:patientId>', methods=['GET'])
def manageAppointments(patientId=None, appointmentId=None):
    try:
        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        if request.method == 'POST':
            data = request.get_json()
            patientId_from_data = data.get('patientId')

            # Expect camelCase from the frontend submission
            start_time_str = data.get('startDate')
            end_time_str = data.get('endDate')

            purpose = data.get('purpose')
            # Handle both snake_case (DB) and camelCase (Frontend)
            doctor_id = data.get('doctor_id') or data.get('doctorId') or data.get('doctor')
            notes = data.get('notes')

            # --- Specific Field Validation ---
            missing_fields = []

            if not patientId_from_data:
                missing_fields.append("Patient ID")
            if not start_time_str:
                missing_fields.append("Start Time (startDate)")
            if not end_time_str:
                missing_fields.append("End Time (endDate)")
            if not doctor_id:
                missing_fields.append("Doctor ID")
            if not purpose:
                missing_fields.append("Purpose")

            if missing_fields:
                error_message = f"Missing required appointment fields: {', '.join(missing_fields)}"
                return jsonify({"error": error_message}), 400
            # ----------------------------------

            if checkAppointmentConflict(conn, doctor_id, start_time_str, end_time_str):
                return jsonify(
                    {"error": "Conflict: Doctor is already booked during this time."}), 409

            # INSERT NEW APPOINTMENT
            cursor.execute(
                """
                INSERT INTO appointments (patient_id, appointment_start_date, appointment_end_date, purpose, doctor_id, notes, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'Scheduled') 
                RETURNING appointment_id, appointment_start_date, appointment_end_date, purpose, doctor_id, notes, status
                """,
                (patientId_from_data, start_time_str, end_time_str, purpose, doctor_id, notes)
            )
            appointment = cursor.fetchone()
            conn.commit()
            return jsonify(appointment), 201

        elif request.method == 'GET':
            doctor_id_param = request.args.get('doctor_id')  # Doctor ID parameter (for staff view)
            date_param = request.args.get('date')  # Date parameter (for staff view)

            # 1. Fetch single appointment by ID
            if appointmentId:
                cursor.execute("SELECT * FROM appointments WHERE appointment_id = %s", (appointmentId,))
                appointment = cursor.fetchone()
                if not appointment:
                    return jsonify({"error": "Appointment not found"}), 404
                return jsonify(appointment), 200

            # 2. Staff Calendar View (by Doctor ID)
            if doctor_id_param:
                try:
                    # --- CRITICAL FIX: Explicitly convert parameter to integer ---
                    doctor_id_int = int(doctor_id_param)
                    # -----------------------------------------------------------
                except ValueError:
                    logging.error(f"Invalid doctor_id format received: {doctor_id_param}")
                    return jsonify({"error": "Invalid Doctor ID format."}), 400

                cursor.execute(
                    """
                    SELECT 
                        a.appointment_id, 
                        TO_CHAR(a.appointment_start_date, 'YYYY-MM-DD HH24:MI') AS startTime, 
                        TO_CHAR(a.appointment_end_date, 'YYYY-MM-DD HH24:MI') AS endTime,
                        a.purpose, 
                        a.status, 
                        a.notes,
                        a.doctor_id,
                        a.patient_id,
                        p.first_name AS patient_first_name, 
                        p.last_name AS patient_last_name
                    FROM appointments a
                    LEFT JOIN patients p ON a.patient_id = p.patient_id
                    WHERE a.doctor_id = %s
                    ORDER BY a.appointment_start_date ASC
                    """,
                    (doctor_id_int,)  # Use the converted integer
                )
                appointments = cursor.fetchall()
                # Clean up output for frontend consumption
                for appt in appointments:
                    first_name = appt.pop('patient_first_name')
                    last_name = appt.pop('patient_last_name')
                    if first_name and last_name:
                        appt['patientName'] = f"{first_name} {last_name}"
                    else:
                        appt['patientName'] = f"Patient ID: {appt['patient_id']} (Unknown)"
                return jsonify(appointments), 200

            # 3. Fallback Staff View (by Date)
            if date_param:
                cursor.execute(
                    """
                    SELECT 
                        a.appointment_id, 
                        TO_CHAR(a.appointment_start_date, 'YYYY-MM-DD HH24:MI') AS startTime, 
                        TO_CHAR(a.appointment_end_date, 'YYYY-MM-DD HH24:MI') AS endTime,
                        a.purpose, 
                        a.status, 
                        a.notes,
                        a.doctor_id,
                        a.patient_id,
                        p.first_name AS patient_first_name, 
                        p.last_name AS patient_last_name
                    FROM appointments a
                    LEFT JOIN patients p ON a.patient_id = p.patient_id
                    WHERE DATE(a.appointment_start_date) = %s
                    ORDER BY a.appointment_start_date ASC
                    """,
                    (date_param,)
                )
                appointments = cursor.fetchall()
                for appt in appointments:
                    first_name = appt.pop('patient_first_name')
                    last_name = appt.pop('patient_last_name')
                    if first_name and last_name:
                        appt['patientName'] = f"{first_name} {last_name}"
                    else:
                        appt['patientName'] = f"Patient ID: {appt['patient_id']} (Unknown)"
                return jsonify(appointments), 200


            # 4. Patient Profile View (by patientId from URL - used by AppointmentScheduler.js)
            elif patientId is not None:
                cursor.execute(
                    """
                    SELECT 
                        appointment_id, 
                        TO_CHAR(appointment_start_date, 'YYYY-MM-DD HH24:MI') AS appointment_date, 
                        purpose, status, doctor_id, notes 
                    FROM appointments 
                    WHERE patient_id = %s
                    ORDER BY appointment_start_date DESC
                    """,
                    (patientId,)
                )
                appointments = cursor.fetchall()
                return jsonify(appointments), 200

            else:
                return jsonify({"error": "Missing required doctor ID, date, or patientId parameter"}), 400

    except Exception as e:
        logging.exception("Appointment management failed")
        return jsonify({"error": f"Appointment management failed: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ----------------------------------------------------------------------
# ✏️ Appointment Editing (PUT)
# ----------------------------------------------------------------------

@app.route('/api/appointments/<int:appointmentId>', methods=['PUT'])
def editAppointment(appointmentId):
    conn = None
    cursor = None
    try:
        data = request.get_json()
        patientId = data.get('patientId')

        start_time_str = data.get('start_time')
        end_time_str = data.get('end_time')

        purpose = data.get('purpose')
        doctor_id = data.get('doctorId')
        notes = data.get('notes')
        status = data.get('status')

        if not all([patientId, start_time_str, end_time_str, doctor_id, purpose, status]):
            return jsonify({"error": "Missing required fields for appointment update"}), 400

        conn = getDbConnection()
        if checkAppointmentConflict(conn, doctor_id, start_time_str, end_time_str, appointmentId):
            return jsonify({"error": "Conflict: Doctor is already booked during this time."}), 409

        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
            UPDATE appointments
            SET patient_id = %s, 
                appointment_start_date = %s, 
                appointment_end_date = %s, 
                purpose = %s, 
                doctor_id = %s, 
                notes = %s,
                status = %s
            WHERE appointment_id = %s
            RETURNING appointment_id, appointment_start_date, appointment_end_date, purpose, doctor_id, notes, status
            """,
            (patientId, start_time_str, end_time_str, purpose, doctor_id, notes, status, appointmentId)
        )
        updated_appt = cursor.fetchone()
        conn.commit()

        if not updated_appt:
            return jsonify({"error": "Appointment not found"}), 404

        return jsonify(updated_appt), 200

    except Exception as e:
        logging.exception("Failed to edit appointment")
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ----------------------------------------------------------------------
# Appointment Status Update (PATCH)
# ----------------------------------------------------------------------

@app.route('/api/appointments/<int:appointmentId>/status', methods=['PATCH'])
def updateAppointmentStatus(appointmentId):
    conn = None
    cursor = None
    try:
        conn = getDbConnection()
        cursor = conn.cursor()
        data = request.get_json()

        newStatus = data.get('status')

        if newStatus not in ['Scheduled', 'Completed', 'Cancelled']:
            return jsonify({"error": "Invalid status provided"}), 400

        # Update DB status
        cursor.execute("""
            UPDATE appointments
            SET status = %s
            WHERE appointment_id = %s
        """, (newStatus, appointmentId))

        if cursor.rowcount == 0:
            conn.rollback()
            return jsonify({"error": "Appointment not found"}), 404

        conn.commit()
        return jsonify({"message": f"Appointment {appointmentId} status updated to {newStatus}"}), 200

    except Exception as e:
        logging.exception(f"Error patching appointment status {appointmentId}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
# Medical History Access
@app.route('/api/medical-records/<int:patientId>', methods=['GET'])
def getMedicalRecords(patientId):
    try:
        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """ SELECT record_id, record_type, record_data, created_by,
                TO_CHAR(visit_date, 'YYYY-MM-DD') AS visit_date,
                TO_CHAR(created_at, 'YYYY-MM-DD') AS created_at,
                department FROM medical_records WHERE patient_id = %s""",
            (patientId,)
        )
        records = cursor.fetchall()
        return jsonify(records), 200

    except Exception as e:
        return jsonify({"error": f"Failed to fetch medical records: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

# Prescription Management
@app.route('/api/prescriptions', methods=['POST'])
@app.route('/api/prescriptions/<int:patientId>', methods=['GET'])
# def managePrescriptions(patientId=None):
#     try:
#         conn = getDbConnection()
#         cursor = conn.cursor(cursor_factory=RealDictCursor)

#         if request.method == 'POST':
#             data = request.get_json()
#             patientId = data.get('patientId')
#             medicationName = data.get('medicationName')
#             dosage = data.get('dosage')
#             instructions = data.get('instructions')
#             cursor.execute(
#                 """
#                 INSERT INTO prescriptions (patient_id, medication_name, dosage, instructions)
#                 VALUES (%s, %s, %s, %s) RETURNING prescription_id, medication_name, dosage, instructions, issued_date
#                 """,
#                 (patientId, medicationName, dosage, instructions)
#             )
#             prescription = cursor.fetchone()
#             conn.commit()
#             return jsonify(prescription), 201

#         elif request.method == 'GET':
#             cursor.execute(
#                 "SELECT prescription_id, medication_name, dosage, instructions, issued_date FROM prescriptions WHERE patient_id = %s",
#                 (patientId,)
#             )
#             prescriptions = cursor.fetchall()
#             return jsonify(prescriptions), 200

#     except Exception as e:
#         return jsonify({"error": f"Prescription management failed: {str(e)}"}), 500
#     finally:
#         cursor.close()
#         conn.close()
def getPrescriptions(patientId):
    conn = None
    cursor = None
    try:
        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Fetch all prescriptions for the patient
        cursor.execute("""
            SELECT 
                prescription_id,
                patient_id,
                medication_name,
                dosage,
                instructions,
                TO_CHAR(issued_date, 'YYYY-MM-DD') AS issued_date,
                frequency,
                duration,
                status,
                type
            FROM prescriptions
            WHERE patient_id = %s
            ORDER BY issued_date DESC
        """, (patientId,))

        all_prescriptions = cursor.fetchall()

        # Split into medications and exercises based on type column
        medications = [p for p in all_prescriptions if p.get('type', '').lower() in ['medication', 'med']]
        exercises = [p for p in all_prescriptions if p.get('type', '').lower() in ['exercise', 'physio', 'therapy']]

        return jsonify({
            'medications': medications,
            'exercises': exercises
        }), 200

    except Exception as e:
        logging.exception("Failed to fetch prescriptions")
        return jsonify({"error": f"Failed to fetch prescriptions: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Endpoint to update prescription status
@app.route('/api/prescriptions/<int:prescriptionId>', methods=['PUT'])
def updatePrescriptionStatus(prescriptionId):
    conn = None
    cursor = None
    try:
        data = request.get_json()
        new_status = data.get('status')

        if not new_status:
            return jsonify({"error": "Status is required"}), 400

        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            UPDATE prescriptions
            SET status = %s
            WHERE prescription_id = %s
            RETURNING prescription_id, status
        """, (new_status, prescriptionId))

        result = cursor.fetchone()
        conn.commit()

        if not result:
            return jsonify({"error": "Prescription not found"}), 404

        return jsonify(result), 200

    except Exception as e:
        logging.exception("Failed to update prescription")
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Billing and Payment Processing
@app.route('/api/billing', methods=['POST'])
@app.route('/api/billing/<int:patientId>', methods=['GET'])
def manageBilling(patientId=None):
    try:
        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        if request.method == 'POST':
            data = request.get_json()
            patientId = data.get('patientId')
            amount = data.get('amount')
            dueDate = data.get('dueDate')
            # NEW: Capture icd10_code from the admin form
            icd10_code = data.get('icd10_code')

            if not all([patientId, amount, dueDate]):
                return jsonify({"error": "Missing required fields for bill creation"}), 400


            cursor.execute(
                """
                INSERT INTO billing (patient_id, amount, due_date, status, icd10_code)
                VALUES (%s, %s, %s, 'pending', %s) 
                RETURNING billing_id, amount, due_date, status, icd10_code
                """,
                # NEW: Pass icd10_code as a parameter
                (patientId, amount, dueDate, icd10_code)
            )
            bill = cursor.fetchone()
            conn.commit()
            return jsonify(bill), 201

        elif request.method == 'GET':
            cursor.execute(
                """
            SELECT 
                b.billing_id,
                b.patient_id,
                b.amount,
                b.status,
                TO_CHAR(b.due_date, 'YYYY-MM-DD') AS due_date,
                TO_CHAR(b.created_at, 'YYYY-MM-DD') AS created_at,
                b.appointment_id,
                b.icd10_code,
                b.insurance_company,
                b.payment_method,
                p.first_name,
                p.last_name,
                p.email
            FROM billing b
            JOIN patients p ON b.patient_id = p.patient_id
            WHERE b.patient_id = %s
            ORDER BY b.created_at DESC
        """,
                (patientId,)
            )
            bills = cursor.fetchall()
            return jsonify(bills), 200

    except Exception as e:
        return jsonify({"error": f"Billing management failed: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()

# Endpoint to update billing status and payment info
@app.route('/api/billing/<int:billingId>', methods=['PUT'])
def updateBilling(billingId):
    conn = None
    cursor = None
    try:
        data = request.get_json() or {}
        status = data.get('status')
        payment_method = data.get('payment_method')

        if not status:
            return jsonify({"error": "Status is required"}), 400

        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Build dynamic update
        fields = []
        values = []

        if status:
            fields.append('status = %s')
            values.append(status)
        if payment_method:
            fields.append('payment_method = %s')
            values.append(payment_method)

        if not fields:
            return jsonify({"error": "No fields to update"}), 400

        values.append(billingId)
        sql = f"""
            UPDATE billing
            SET {', '.join(fields)}
            WHERE billing_id = %s
            RETURNING billing_id, status, payment_method
        """

        cursor.execute(sql, tuple(values))
        result = cursor.fetchone()
        conn.commit()

        if not result:
            return jsonify({"error": "Billing record not found"}), 404

        return jsonify(result), 200

    except Exception as e:
        logging.exception("Failed to update billing")
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/admin/billing/all', methods=['GET'])
def getAllBillsForAdmin():
    conn = None
    cursor = None
    try:
        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # This query fetches all bills and joins patient info for the admin list view
        cursor.execute(
            """
            SELECT 
                b.billing_id,
                b.patient_id,
                b.amount,
                b.status,
                TO_CHAR(b.due_date, 'YYYY-MM-DD') AS due_date,
                b.icd10_code,
                p.first_name,
                p.last_name,
                p.email
            FROM billing b
            JOIN patients p ON b.patient_id = p.patient_id
            ORDER BY b.created_at DESC
        """
        )
        bills = cursor.fetchall()
        return jsonify(bills), 200

    except Exception as e:
        logging.exception("Failed to fetch all bills for admin")
        return jsonify({"error": f"Admin Billing fetch failed: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == '__main__':
    app.run(debug=True)