# app.py
import bcrypt
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
import logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
CORS(app)

# Database connection
DB_CONFIG = {
    "dbname": "rehabcare_db",
    "user": "postgres",
    "password": "abcde", # change to yours
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
# Appointment Scheduling
# app.py (Replace existing manageAppointments function)

# Appointment Scheduling
@app.route('/api/appointments', methods=['POST', 'GET'])
@app.route('/api/appointments/<int:patientId>', methods=['GET'])
def manageAppointments(patientId=None):
    conn = None
    cursor = None
    try:
        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        if request.method == 'POST':
            data = request.get_json()
            patientId_post = data.get('patientId')
            appointmentDate = data.get('appointmentDate')
            appointmentTime = data.get('appointmentTime')
            purpose = data.get('purpose')
            doctor_id = data.get('doctor_id') or data.get('doctorId')
            notes = data.get('notes')

            if not all([patientId_post, appointmentDate, appointmentTime, purpose, doctor_id]):
                return jsonify({"error": "Missing required fields for appointment"}), 400

            doctor_id = doctor_id if doctor_id and str(doctor_id).strip() else None
            appointmentTime = appointmentTime if appointmentTime and str(appointmentTime).strip() else None
            notes = notes if notes and str(notes).strip() else None

            cursor.execute(
                """
                SELECT appointment_id FROM appointments 
                WHERE doctor_id = %s 
                  AND appointment_date = %s 
                  AND appointment_time = %s
                  AND status != 'cancelled'
                """,
                (doctor_id, appointmentDate, appointmentTime)
            )
            existing_appt = cursor.fetchone()

            if existing_appt:
                return jsonify({
                    "error": "Conflict: This doctor is already booked at this exact time."
                }), 409  # 409 Conflict status code

            cursor.execute(
                """
                INSERT INTO appointments (patient_id, appointment_date, appointment_time, purpose, doctor_id, notes, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'scheduled') RETURNING appointment_id, appointment_date, appointment_time, purpose, doctor_id, notes, status
                """,
                (patientId_post, appointmentDate, appointmentTime, purpose, doctor_id, notes)
            )
            appointment = cursor.fetchone()
            appointment_id = appointment['appointment_id']
            conn.commit()
            if appointment and appointment.get('appointment_time'):
                appointment['appointment_time'] = str(appointment['appointment_time'])

            BILLING_AMOUNT = 10.00
            due_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
            cursor.execute(
                """
                INSERT INTO billing (
                    patient_id, amount, due_date, icd10_code, status, appointment_id
                ) VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING billing_id
                """,
                (
                    patientId_post,
                    BILLING_AMOUNT,
                    due_date,
                    purpose,  # The ICD-10 code from the appointment purpose
                    'pending',  # Default status for auto-generated bill
                    appointment_id  # Link the bill to the appointment
                )
            )
            bill = cursor.fetchone()
            billing_id = bill['billing_id']
            # ---------------------------------------------------------------------

            conn.commit()

            return jsonify({
                "message": "Appointment scheduled and bill created successfully",
                "appointment_id": appointment_id,
                "billing_id": billing_id
            }), 201
            return jsonify(appointment), 201

        elif request.method == 'GET':
            doctor_id_str = request.args.get('doctor_id')

            # --- STAFF APPOINTMENT FETCH (GET /api/appointments?doctor_id=X) ---
            if doctor_id_str:
                try:
                    # CRITICAL: Cast URL parameter to int for query execution
                    doctor_id = int(doctor_id_str)
                except ValueError:
                    return jsonify({"error": "Invalid doctor ID format."}), 400

                query = """
                    SELECT a.appointment_id, a.patient_id, a.appointment_date,
                           TO_CHAR(a.appointment_time, 'HH24:MI:SS') AS appointment_time,
                           a.purpose, a.status, a.doctor_id, a.notes,
                           p.first_name, p.last_name
                    FROM appointments a
                    JOIN patients p ON a.patient_id = p.patient_id
                    WHERE a.doctor_id = %s
                    ORDER BY a.appointment_date, a.appointment_time
                """
                cursor.execute(query, (doctor_id,))
                appointments = cursor.fetchall()

                # Format to ISO strings for Staff Manager calendar
                formatted_appts = []
                for appt in appointments:
                    appt_date = appt['appointment_date']

                    # 1. Robust Time Parsing
                    time_str = appt.get('appointment_time') or '00:00:00'
                    try:
                        appointment_time_obj = datetime.strptime(time_str, '%H:%M:%S').time()
                    except ValueError:
                        appointment_time_obj = datetime.strptime('00:00:00', '%H:%M:%S').time()

                    # 2. Combine Date and Time
                    if not appt_date:
                        logging.warning(f"Appointment {appt['appointment_id']} has a NULL date. Skipping.")
                        continue  # Skip appointments with no date

                    start_dt = datetime.combine(appt_date, appointment_time_obj)
                    end_dt = start_dt + timedelta(minutes=60)  # Fixed 60-minute slot

                    # 3. Handle Potential NULL Names for patientName
                    first_name = appt.get('first_name') or ''
                    last_name = appt.get('last_name') or ''
                    patient_name = f"{first_name} {last_name}".strip()
                    if not patient_name:
                        patient_name = f"ID: {appt['patient_id']}"

                    formatted_appts.append({
                        'appointment_id': appt['appointment_id'],
                        'patient_id': appt['patient_id'],
                        'patientName': patient_name,
                        'startTime': start_dt.isoformat(),  # ISO string
                        'endTime': end_dt.isoformat(),  # ISO string
                        'purpose': appt['purpose'],
                        'notes': appt['notes'],
                        'doctor_id': appt['doctor_id'],
                        'status': appt['status'],
                    })
                return jsonify(formatted_appts), 200

            # --- PATIENT APPOINTMENT FETCH (Original Logic) ---
            elif patientId is not None:
                cursor.execute(
                    "SELECT appointment_id, appointment_date, TO_CHAR(appointment_time, 'HH24:MI:SS') AS appointment_time, purpose, status, doctor_id, notes FROM appointments WHERE patient_id = %s ORDER BY appointment_date DESC",
                    (patientId,)
                )
                appointments = cursor.fetchall()
                return jsonify(appointments), 200

            else:
                return jsonify({"error": "Missing patientId or doctor_id parameter"}), 400

    except Exception as e:
        # Logging the full traceback is crucial here to find the exact crash point
        logging.exception("Appointment management failed during GET or POST")
        return jsonify({"error": f"Appointment management failed: {str(e)}"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


# app.py (Replace existing updateAppointment function)

@app.route('/api/appointments/<int:appointmentId>', methods=['PUT', 'PATCH'])
@app.route('/api/appointments/<int:appointmentId>/status', methods=['PATCH'])
def updateAppointment(appointmentId):
    conn = None
    cursor = None
    try:
        data = request.get_json() or {}
        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # --- Logic for Simple Status Update (PATCH) ---
        if request.method == 'PATCH':
            new_status = data.get('status')

            if not new_status or new_status.lower() not in ['scheduled', 'completed', 'cancelled']:
                return jsonify({'error': 'Invalid or missing status provided for PATCH'}), 400

            new_status_lower = new_status.lower()

            cursor.execute(
                "UPDATE appointments SET status = %s WHERE appointment_id = %s RETURNING appointment_id, status",
                (new_status_lower, appointmentId)
            )

            result = cursor.fetchone()
            if not result:
                return jsonify({'error': f'Appointment ID {appointmentId} not found.'}), 404

            conn.commit()
            return jsonify(
                {'message': f'Appointment {appointmentId} status updated to {new_status}', 'appointment': result}), 200


        # --- Logic for Full Update (PUT) ---
        elif request.method == 'PUT':
            appointment_date = data.get('appointmentDate')
            appointment_time = data.get('appointmentTime')
            purpose = data.get('purpose')
            doctor_id = data.get('doctor_id') or data.get('doctorId')
            notes = data.get('notes')

            # Building dynamic update query based on fields provided (omitted for brevity,
            # but ensure your logic here handles updating only provided fields or validating all required fields for a PUT)

            fields = []
            values = []

            if appointment_date is not None:
                fields.append('appointment_date = %s')
                values.append(appointment_date)
            # ... (rest of your PUT update logic here for time, purpose, doctor_id, notes) ...
            if not fields:
                return jsonify({"error": "No fields to update"}), 400

            values.append(appointmentId)
            sql = f"""
                UPDATE appointments
                SET {', '.join(fields)}
                WHERE appointment_id = %s
                RETURNING appointment_id, appointment_date, TO_CHAR(appointment_time, 'HH24:MI:SS') AS appointment_time, purpose, doctor_id, notes, status
            """

            # EXECUTE THE QUERY HERE... (using the built sql and values tuple)
            # Example simplified update:
            cursor.execute(
                "UPDATE appointments SET appointment_date = %s, appointment_time = %s, purpose = %s, doctor_id = %s, notes = %s WHERE appointment_id = %s RETURNING *",
                (appointment_date, appointment_time, purpose, doctor_id, notes, appointmentId)
            )

            result = cursor.fetchone()
            conn.commit()

            if not result:
                return jsonify({"error": "Appointment not found"}), 404

            return jsonify(result), 200

    except Exception as e:
        logging.exception("Failed to update appointment")
        conn.rollback()
        return jsonify({"error": f'Failed to update appointment: {str(e)}'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
# Cancel appointment
@app.route('/api/appointments/<int:appointmentId>/cancel', methods=['PUT'])
def cancelAppointment(appointmentId):
    conn = None
    cursor = None
    try:
        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            UPDATE appointments
            SET status = 'cancelled'
            WHERE appointment_id = %s
            RETURNING appointment_id, status
        """, (appointmentId,))
        
        result = cursor.fetchone()
        conn.commit()
        
        if not result:
            return jsonify({"error": "Appointment not found"}), 404
        
        return jsonify({"message": "Appointment cancelled successfully", "appointment_id": result['appointment_id']}), 200
    
    except Exception as e:
        logging.exception("Failed to cancel appointment")
        return jsonify({"error": str(e)}), 500
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
            # --- NEW: Accept ICD-10 Code ---
            icd10_code = data.get('icd10Code') or data.get('icd10_code')

            if not all([patientId, amount, dueDate]):
                return jsonify({"error": "Missing required fields (patientId, amount, dueDate)"}), 400

            cursor.execute(
                """
                INSERT INTO billing (patient_id, amount, due_date, icd10_code, status)
                VALUES (%s, %s, %s, %s, 'pending') RETURNING billing_id, amount, due_date, status, icd10_code
                """,
                (patientId, amount, dueDate, icd10_code)  # <-- ADDED icd10_code
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
def get_all_bills():
    conn = None
    cursor = None
    try:
        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        query = """
            SELECT 
                b.billing_id,
                b.patient_id,
                b.amount,
                b.status,
                TO_CHAR(b.due_date, 'YYYY-MM-DD') AS due_date,
                b.icd10_code,
                p.first_name,
                p.last_name
            FROM billing b
            JOIN patients p ON b.patient_id = p.patient_id
            ORDER BY b.due_date DESC;
        """
        cursor.execute(query)
        bills = cursor.fetchall()

        # Convert amount to string for JSON serialization
        formatted_bills = [{
            **bill,
            'amount': str(bill['amount'])
        } for bill in bills]

        return jsonify(formatted_bills), 200

    except Exception as e:
        logging.exception("Failed to fetch all bills for admin")
        return jsonify({'error': 'Failed to fetch all bills'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/doctor/register', methods=['POST'])
def registerDoctor():
    try:
        data = request.get_json()
        first_name = data.get('first_name') or data.get('firstName')
        last_name = data.get('last_name') or data.get('lastName')
        email = data.get('email')
        password = data.get('password')
        specialization = data.get('specialization')
        phone = data.get('phone')
        date_of_birth = data.get('date_of_birth') or data.get('dateOfBirth')

        if not all([first_name, last_name, email, password]):
            return jsonify({"error": "Missing required fields"}), 400

        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            INSERT INTO doctor (first_name, last_name, email, phone, specialization, date_of_birth)
            VALUES (%s,%s,%s,%s,%s,%s)
            RETURNING doctor_id
        """, (first_name, last_name, email, phone, specialization, date_of_birth))

        doctor = cursor.fetchone()

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            "doctorId": doctor["doctor_id"],
            "message": "Doctor registration successful"
        }), 201

    except Exception as e:
        return jsonify({"error": f"Doctor registration failed: {str(e)}"}), 500


@app.route('/api/doctor/login', methods=['POST'])
def doctorLogin():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not all([email, password]):
            return jsonify({"error": "Missing email or password"}), 400

        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT doctor_id, email, password_hash
            FROM doctor
            WHERE email = %s
        """, (email,))
        
        doctor = cursor.fetchone()

        if not doctor:
            return jsonify({"error": "Invalid credentials"}), 401

        stored_hash = doctor["password_hash"].encode("utf-8")

        if not bcrypt.checkpw(password.encode("utf-8"), stored_hash):
            return jsonify({"error": "Invalid credentials"}), 401

        return jsonify({
            "doctorId": doctor["doctor_id"],
            "message": "Login successful"
        }), 200

    except Exception as e:
        return jsonify({"error": f"Login failed: {str(e)}"}), 500

@app.route('/api/doctor/<int:doctorId>', methods=['GET', 'PUT'])
def manageDoctorProfile(doctorId):
    conn = None
    cursor = None
    try:
        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        if request.method == "GET":
            cursor.execute("""
                SELECT doctor_id, first_name, last_name, email, phone,
                       specialization, TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS date_of_birth
                FROM doctor
                WHERE doctor_id = %s
            """, (doctorId,))
            doctor = cursor.fetchone()

            if not doctor:
                return jsonify({"error": "Doctor not found"}), 404

            return jsonify(doctor), 200

        if request.method == "PUT":
            data = request.get_json() or {}

            fields = []
            values = []

            for key, col in [
                ("first_name", "first_name"),
                ("last_name", "last_name"),
                ("email", "email"),
                ("phone", "phone"),
                ("specialization", "specialization"),
                ("date_of_birth", "date_of_birth")
            ]:
                v = data.get(key) or data.get(key.replace("_", ""))
                if v:
                    fields.append(f"{col} = %s")
                    values.append(v)

            if not fields:
                return jsonify({"error": "No fields to update"}), 400

            values.append(doctorId)

            sql = f"""
                UPDATE doctor
                SET {', '.join(fields)}
                WHERE doctor_id = %s
                RETURNING doctor_id, first_name, last_name, email, phone, specialization,
                          TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS date_of_birth
            """

            cursor.execute(sql, tuple(values))
            updated = cursor.fetchone()
            conn.commit()

            return jsonify(updated), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/doctor/<int:doctorId>/appointments', methods=['GET'])
def doctorAppointments(doctorId):
    try:
        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT a.appointment_id, a.patient_id, a.appointment_date,
                   TO_CHAR(a.appointment_time, 'HH24:MI') AS appointment_time,
                   a.purpose, a.status,
                   p.first_name, p.last_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            WHERE a.doctor_id = %s
            ORDER BY a.appointment_date, a.appointment_time
        """, (doctorId,))

        appointments = cursor.fetchall()
        return jsonify(appointments), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/doctor/prescriptions', methods=['POST'])
def doctorCreatePrescription():
    try:
        data = request.get_json()

        patient_id = data.get("patientId")
        doctor_id = data.get("doctorId")
        medication_name = data.get("medicationName")
        dosage = data.get("dosage")
        instructions = data.get("instructions")
        type = data.get("type")  # medication / exercise / therapy
        frequency = data.get("frequency")
        duration = data.get("duration")

        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            INSERT INTO prescriptions
            (patient_id, doctor_id, medication_name, dosage, instructions, type, frequency, duration, status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,'active')
            RETURNING prescription_id
        """, (patient_id, doctor_id, medication_name, dosage, instructions, type, frequency, duration))

        pres = cursor.fetchone()
        conn.commit()

        return jsonify({"message": "Prescription created", "id": pres["prescription_id"]}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500




if __name__ == '__main__':
    app.run(debug=True)