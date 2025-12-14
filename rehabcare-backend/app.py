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
    "password": "Admin@123", # change to yours 
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
@app.route('/api/appointments', methods=['POST'])
@app.route('/api/appointments/<int:patientId>', methods=['GET'])
def manageAppointments(patientId=None):
    try:
        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        if request.method == 'POST':
            data = request.get_json()
            patientId = data.get('patientId')
            appointmentDate = data.get('appointmentDate')
            appointmentTime = data.get('appointmentTime')
            purpose = data.get('purpose')
            doctor_id = data.get('doctor_id') or data.get('doctorId')
            notes = data.get('notes')
            # Convert empty strings to None/NULL
            doctor_id = doctor_id if doctor_id and str(doctor_id).strip() else None
            appointmentTime = appointmentTime if appointmentTime and str(appointmentTime).strip() else None
            notes = notes if notes and str(notes).strip() else None
            cursor.execute(
                """
                INSERT INTO appointments (patient_id, appointment_date,appointment_time, purpose, doctor_id, notes, status)
                VALUES (%s, %s, %s, %s, %s,%s, 'scheduled') RETURNING appointment_id, appointment_date,appointment_time, purpose, doctor_id, notes, status
                """,
                (patientId, appointmentDate,appointmentTime, purpose, doctor_id, notes)
            )
            appointment = cursor.fetchone()
            conn.commit()
            # Convert time object to string
            if appointment and appointment.get('appointment_time'):
                appointment['appointment_time'] = str(appointment['appointment_time'])
            return jsonify(appointment), 201

        elif request.method == 'GET':
            cursor.execute(
                "SELECT appointment_id, appointment_date, TO_CHAR(appointment_time, 'HH24:MI:SS') AS appointment_time, purpose, status, doctor_id, notes FROM appointments WHERE patient_id = %s ORDER BY appointment_date DESC",
                (patientId,)
            )
            appointments = cursor.fetchall()
            return jsonify(appointments), 200

    except Exception as e:
        return jsonify({"error": f"Appointment management failed: {str(e)}"}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/appointments/<int:appointmentId>', methods=['PUT'])
def updateAppointment(appointmentId):
    conn = None
    cursor = None
    try:
        data = request.get_json() or {}
        appointment_date = data.get('appointmentDate')
        appointment_time = data.get('appointmentTime')
        purpose = data.get('purpose')
        doctor_id = data.get('doctor_id') or data.get('doctorId')
        notes = data.get('notes')
        
        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Build dynamic update
        fields = []
        values = []
        
        if appointment_date is not None:
            fields.append('appointment_date = %s')
            values.append(appointment_date)
        if appointment_time is not None:
            fields.append('appointment_time = %s')
            values.append(appointment_time)
        if purpose is not None:
            fields.append('purpose = %s')
            values.append(purpose)
        if doctor_id is not None:
            fields.append('doctor_id = %s')
            values.append(doctor_id)
        if notes is not None:
            fields.append('notes = %s')
            values.append(notes)
        
        if not fields:
            return jsonify({"error": "No fields to update"}), 400
        
        values.append(appointmentId)
        sql = f"""
            UPDATE appointments
            SET {', '.join(fields)}
            WHERE appointment_id = %s
            RETURNING appointment_id, appointment_date, TO_CHAR(appointment_time, 'HH24:MI:SS') AS appointment_time, purpose, doctor_id, notes, status
        """
        
        cursor.execute(sql, tuple(values))
        result = cursor.fetchone()
        conn.commit()
        
        if not result:
            return jsonify({"error": "Appointment not found"}), 404
        
        return jsonify(result), 200
    
    except Exception as e:
        logging.exception("Failed to update appointment")
        return jsonify({"error": str(e)}), 500
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
            cursor.execute(
                """
                INSERT INTO billing (patient_id, amount, due_date, status)
                VALUES (%s, %s, %s, 'pending') RETURNING billing_id, amount, due_date, status
                """,
                (patientId, amount, dueDate)
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

@app.route('/api/admin/login', methods=['POST'])
def adminLogin():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Missing credentials"}), 400

    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute("""
        SELECT 
            u.user_id,
            u.password_hash,
            a.admin_id
        FROM users u
        JOIN admin a ON a.user_id = u.user_id
        WHERE u.email = %s AND u.role = 'ADMIN'
    """, (email,))

    admin = cursor.fetchone()
    cursor.close()
    conn.close()

    if not admin:
        return jsonify({"error": "Invalid credentials"}), 401

    if not bcrypt.checkpw(password.encode(), admin["password_hash"].encode()):
        return jsonify({"error": "Invalid credentials"}), 401

    return jsonify({
        "adminId": admin["admin_id"],
        "message": "Admin login successful"
    }), 200

@app.route('/api/admin/dashboard', methods=['GET'])
def adminDashboard():
    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute("SELECT COUNT(*) FROM doctor")
    total_doctors = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) FROM patients")
    total_patients = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) FROM appointments")
    total_appointments = cursor.fetchone()["count"]

    cursor.close()
    conn.close()

    return jsonify({
        "totalDoctors": total_doctors,
        "totalPatients": total_patients,
        "totalAppointments": total_appointments
    }), 200

@app.route('/api/admin/<int:adminId>', methods=['GET'])
def getAdminProfile(adminId):
    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute("""
        SELECT 
            a.admin_id,
            a.first_name,
            a.last_name,
            a.phone,
            a.role_description,
            TO_CHAR(a.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
            u.email
        FROM admin a
        JOIN users u ON a.user_id = u.user_id
        WHERE a.admin_id = %s
    """, (adminId,))

    admin = cursor.fetchone()
    cursor.close()
    conn.close()

    if not admin:
        return jsonify({"error": "Admin not found"}), 404

    return jsonify(admin), 200

@app.route('/api/admin/<int:adminId>', methods=['PUT'])
def updateAdminProfile(adminId):
    data = request.get_json() or {}

    fields = []
    values = []

    mapping = {
        "first_name": "first_name",
        "last_name": "last_name",
        "phone": "phone",
        "role_description": "role_description",
        "date_of_birth": "date_of_birth"
    }

    for key, column in mapping.items():
        if data.get(key) is not None:
            fields.append(f"{column} = %s")
            values.append(data[key])

    if not fields:
        return jsonify({"error": "No data to update"}), 400

    values.append(adminId)

    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute(f"""
        UPDATE admin
        SET {', '.join(fields)}
        WHERE admin_id = %s
        RETURNING admin_id
    """, tuple(values))

    updated = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()

    if not updated:
        return jsonify({"error": "Admin not found"}), 404

    return jsonify({"message": "Admin updated successfully"}), 200

@app.route('/api/admin/doctors', methods=['GET'])
def adminGetDoctors():
    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute("""
        SELECT doctor_id, first_name, last_name, specialization, email, phone
        FROM doctor
        ORDER BY doctor_id DESC
    """)

    doctors = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify(doctors), 200

@app.route('/api/admin/doctors', methods=['POST'])
def adminCreateDoctor():
    data = request.get_json() or {}

    first_name = data.get("firstName")
    last_name = data.get("lastName")
    email = data.get("email")
    password = data.get("password")
    specialization = data.get("specialization")
    phone = data.get("phone")
    dob = data.get("dateOfBirth")

    if not all([first_name, last_name, email, password]):
        return jsonify({"error": "Missing fields"}), 400

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute("""
        INSERT INTO users (username, email, password_hash, role)
        VALUES (%s,%s,%s,'DOCTOR')
        RETURNING user_id
    """, (email, email, password_hash))

    user_id = cursor.fetchone()["user_id"]

    cursor.execute("""
        INSERT INTO doctor
        (user_id, first_name, last_name, email, phone, specialization, date_of_birth)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
        RETURNING doctor_id
    """, (user_id, first_name, last_name, email, phone, specialization, dob))

    doctor_id = cursor.fetchone()["doctor_id"]
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "doctorId": doctor_id,
        "message": "Doctor created successfully"
    }), 201

@app.route('/api/admin/doctors/<int:doctorId>', methods=['PUT'])
def adminUpdateDoctor(doctorId):
    data = request.get_json() or {}

    fields = []
    values = []

    # mapping بين frontend keys و DB columns
    mapping = {
        "firstName": "first_name",
        "lastName": "last_name",
        "email": "email",
        "phone": "phone",
        "specialization": "specialization",
        "dateOfBirth": "date_of_birth"
    }

    for key, column in mapping.items():
        if data.get(key) is not None:
            fields.append(f"{column} = %s")
            values.append(data[key])

    if not fields:
        return jsonify({"error": "No data to update"}), 400

    values.append(doctorId)

    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute(f"""
        UPDATE doctor
        SET {', '.join(fields)}
        WHERE doctor_id = %s
        RETURNING doctor_id
    """, tuple(values))

    updated = cursor.fetchone()
    conn.commit()

    cursor.close()
    conn.close()

    if not updated:
        return jsonify({"error": "Doctor not found"}), 404

    return jsonify({
        "message": "Doctor updated successfully",
        "doctorId": updated["doctor_id"]
    }), 200

@app.route('/api/admin/doctors/<int:doctorId>', methods=['DELETE'])
def adminDeleteDoctor(doctorId):
    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    # get user_id first
    cursor.execute("""
        SELECT user_id FROM doctor WHERE doctor_id = %s
    """, (doctorId,))
    row = cursor.fetchone()

    if not row:
        cursor.close()
        conn.close()
        return jsonify({"error": "Doctor not found"}), 404

    user_id = row["user_id"]

    cursor.execute("DELETE FROM doctor WHERE doctor_id = %s", (doctorId,))
    cursor.execute("DELETE FROM users WHERE user_id = %s", (user_id,))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "message": "Doctor and user deleted successfully"
    }), 200

@app.route('/api/admin/billing', methods=['GET'])
def adminGetBilling():
    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute("""
        SELECT
            b.billing_id,
            b.amount,
            b.status,
            b.payment_method,
            TO_CHAR(b.due_date, 'YYYY-MM-DD') AS due_date,
            TO_CHAR(b.created_at, 'YYYY-MM-DD') AS created_at,
            p.patient_id,
            p.first_name,
            p.last_name,
            p.email
        FROM billing b
        JOIN patients p ON b.patient_id = p.patient_id
        ORDER BY b.created_at DESC
    """)

    bills = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(bills), 200

@app.route('/api/admin/billing/<int:billingId>', methods=['PUT'])
def adminUpdateBilling(billingId):
    data = request.get_json() or {}

    fields = []
    values = []

    mapping = {
        "status": "status",
        "paymentMethod": "payment_method",
        "dueDate": "due_date"
    }

    for key, column in mapping.items():
        if data.get(key) is not None:
            fields.append(f"{column} = %s")
            values.append(data[key])

    if not fields:
        return jsonify({"error": "No data to update"}), 400

    values.append(billingId)

    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute(f"""
        UPDATE billing
        SET {', '.join(fields)}
        WHERE billing_id = %s
        RETURNING billing_id, status, payment_method
    """, tuple(values))

    updated = cursor.fetchone()
    conn.commit()

    cursor.close()
    conn.close()

    if not updated:
        return jsonify({"error": "Billing record not found"}), 404

    return jsonify({
        "message": "Billing updated successfully",
        "billing": updated
    }), 200

@app.route('/api/admin/billing/stats', methods=['GET'])
def adminBillingStats():
    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute("""
        SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'paid') AS paid,
            COUNT(*) FILTER (WHERE status = 'pending') AS pending
        FROM billing
    """)

    stats = cursor.fetchone()

    cursor.close()
    conn.close()

    return jsonify(stats), 200


if __name__ == '__main__':
    app.run(debug=True)