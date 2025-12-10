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
    "password": "JetFreeeBrain$_ENG:Nada", # change to yours 
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

if __name__ == '__main__':
    app.run(debug=True)