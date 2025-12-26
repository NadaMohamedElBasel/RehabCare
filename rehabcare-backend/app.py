
'''
new run script:
-inside rehabcare-frontend:
npm install
-incide Dicom:
npm install
-inside rehabcare-frontend:
npm run start:all
'''


# app.py
import bcrypt
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
from datetime import date
import os
from collections import deque
import io
from pathlib import Path
from uuid import uuid4
import shutil
import tempfile
import zipfile
# optional libs for model inspection
try:
    import h5py
except Exception:
    h5py = None

try:
    import tensorflow as tf
    from tensorflow import keras
    print("✓ TensorFlow loaded successfully")
except Exception as e:
    print(f"✗ TensorFlow import failed: {e}")
    import traceback
    traceback.print_exc()
    tf = None
    keras = None

import numpy as np
from PIL import Image
from flask import send_from_directory, url_for
try:
    import psutil
except Exception:
    psutil = None
from flask import g
import logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
CORS(app)

# Database connection
DB_CONFIG = {
    "dbname": "rehabcare_db",
    "user": "postgres",
    "password": "1234", # change to yours
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
                # Mark scheduled appointments that are now in the past as completed
                cursor.execute("""
                    UPDATE appointments
                    SET status = 'completed'
                    WHERE status = 'scheduled'
                      AND (appointment_date + COALESCE(appointment_time, '23:59:59'::time)) < NOW()
                """)
                conn.commit()
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

# @app.route('/api/doctor/register', methods=['POST'])
# def registerDoctor():
#     try:
#         data = request.get_json()
#         first_name = data.get('first_name') or data.get('firstName')
#         last_name = data.get('last_name') or data.get('lastName')
#         email = data.get('email')
#         password = data.get('password')
#         specialization = data.get('specialization')
#         phone = data.get('phone')
#         date_of_birth = data.get('date_of_birth') or data.get('dateOfBirth')

#         if not all([first_name, last_name, email, password]):
#             return jsonify({"error": "Missing required fields"}), 400

#         password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

#         conn = getDbConnection()
#         cursor = conn.cursor(cursor_factory=RealDictCursor)

#         cursor.execute("""
#             INSERT INTO doctor (first_name, last_name, email, phone, specialization, date_of_birth)
#             VALUES (%s,%s,%s,%s,%s,%s)
#             RETURNING doctor_id
#         """, (first_name, last_name, email, phone, specialization, date_of_birth))

#         doctor = cursor.fetchone()

#         conn.commit()
#         cursor.close()
#         conn.close()

#         return jsonify({
#             "doctorId": doctor["doctor_id"],
#             "message": "Doctor registration successful"
#         }), 201

#     except Exception as e:
#         return jsonify({"error": f"Doctor registration failed: {str(e)}"}), 500


@app.route('/api/doctor/login', methods=['POST'])
def doctorLogin():
    try:
        data = request.get_json() or {}
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Missing email or password"}), 400

        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT
                u.user_id,
                u.email,
                u.password_hash,
                d.doctor_id
            FROM users u
            JOIN doctor d ON d.user_id = u.user_id
            WHERE u.email = %s AND u.role = 'DOCTOR'
        """, (email.strip(),))

        doctor = cursor.fetchone()
        cursor.close()
        conn.close()

        if not doctor:
            return jsonify({"error": "Invalid credentials"}), 401

        if not bcrypt.checkpw(
            password.encode("utf-8"),
            doctor["password_hash"].encode("utf-8")
        ):
            return jsonify({"error": "Invalid credentials"}), 401

        return jsonify({
            "doctorId": doctor["doctor_id"],
            "userId": doctor["user_id"],
            "message": "Doctor login successful"
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

@app.route('/api/doctor/<int:doctorId>/prescriptions', methods=['GET'])
def doctorGetPrescriptions(doctorId):
    try:
        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT
                pr.prescription_id,
                pr.patient_id,
                pr.medication_name,
                pr.dosage,
                pr.instructions,
                pr.issued_date,
                pr.frequency,
                pr.duration,
                pr.status,
                pr.type,
                p.first_name AS patient_first_name,
                p.last_name AS patient_last_name
            FROM prescriptions pr
            JOIN patients p ON pr.patient_id = p.patient_id
            ORDER BY pr.issued_date DESC
        """)

        prescriptions = cursor.fetchall()
        return jsonify(prescriptions), 200

    except Exception as e:
        print("PRESCRIPTIONS ERROR:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/doctor/prescriptions', methods=['POST'])
def doctorCreatePrescription():
    try:
        data = request.get_json() or {}

        patient_id = data.get("patientId")
        medication_name = data.get("medicationName")
        dosage = data.get("dosage")
        instructions = data.get("instructions")
        frequency = data.get("frequency")
        duration = data.get("duration")
        type = data.get("type")

        if not all([patient_id, medication_name]):
            return jsonify({"error": "Missing required fields"}), 400

        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            INSERT INTO prescriptions
            (patient_id, medication_name, dosage, instructions,
             frequency, duration, type, status, issued_date)
            VALUES (%s,%s,%s,%s,%s,%s,%s,'active', CURRENT_DATE)
            RETURNING prescription_id
        """, (
            patient_id,
            medication_name,
            dosage,
            instructions,
            frequency,
            duration,
            type
        ))

        pres = cursor.fetchone()
        conn.commit()

        return jsonify({
            "message": "Prescription created successfully",
            "prescriptionId": pres["prescription_id"]
        }), 201

    except Exception as e:
        print("CREATE PRESCRIPTION ERROR:", e)
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/doctor/<int:doctorId>/patients', methods=['GET'])
def doctorMyPatients(doctorId):
    conn = None
    cursor = None
    try:
        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT DISTINCT
                p.patient_id,
                p.first_name,
                p.last_name,
                p.phone_number,
                p.email
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            WHERE a.doctor_id = %s
            ORDER BY p.first_name, p.last_name
        """, (doctorId,))

        patients = cursor.fetchall()
        return jsonify(patients), 200

    except Exception as e:
        print("MY PATIENTS ERROR:", e)
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/doctor/<int:doctorId>/patients/<int:patientId>/medical-records",methods=["GET"])
def getMedicalRecords_Doctor(doctorId, patientId):
    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute("""
        SELECT 1
        FROM appointments
        WHERE doctor_id = %s AND patient_id = %s
        LIMIT 1
    """, (doctorId, patientId))

    if not cursor.fetchone():
        cursor.close()
        conn.close()
        return jsonify({"error": "Access denied"}), 403

    cursor.execute("""
        SELECT
            record_id,
            patient_id,
            record_type,
            record_data,
            visit_date,
            department,
            created_at,
            created_by
        FROM medical_records
        WHERE patient_id = %s
        ORDER BY visit_date DESC, created_at DESC
    """, (patientId,))

    records = cursor.fetchall()
    cursor.close()
    conn.close()

    return jsonify(records), 200

@app.route('/api/doctor/<int:doctorId>/patients/<int:patientId>/medical-records', methods=['POST'])
def createMedicalRecord_Doctor(doctorId, patientId):
    data = request.get_json() or {}

    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    #  Authorization + get appointment date
    cursor.execute("""
        SELECT appointment_date
        FROM appointments
        WHERE doctor_id = %s AND patient_id = %s
        ORDER BY appointment_date DESC
        LIMIT 1
    """, (doctorId, patientId))

    appointment = cursor.fetchone()
    if not appointment:
        cursor.close()
        conn.close()
        return jsonify({"error": "No appointment found for this patient"}), 400

    visit_date = appointment["appointment_date"]

    #  Insert medical record
    cursor.execute("""
        INSERT INTO medical_records
        (
          patient_id,
          record_type,
          record_data,
          visit_date,
          department,
          created_at,
          created_by
        )
        VALUES (%s,%s,%s,%s,%s,NOW(),%s)
        RETURNING record_id
    """, (
        patientId,
        data.get("recordType"),
        data.get("recordData"),
        visit_date,                # 👈 from appointment
        data.get("department"),
        doctorId
    ))

    record = cursor.fetchone()
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "message": "Medical record created successfully",
        "record_id": record["record_id"],
        "visit_date": visit_date
    }), 201

@app.route('/api/doctor/<int:doctorId>/medical-records/<int:recordId>', methods=['PUT'])
def updateMedicalRecord(doctorId, recordId):
    data = request.get_json() or {}

    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute("""
        SELECT mr.record_id
        FROM medical_records mr
        JOIN appointments a ON mr.patient_id = a.patient_id
        WHERE mr.record_id = %s AND a.doctor_id = %s
        LIMIT 1
    """, (recordId, doctorId))

    if not cursor.fetchone():
        cursor.close()
        conn.close()
        return jsonify({"error": "Access denied"}), 403

    cursor.execute("""
        UPDATE medical_records
        SET
            record_type = %s,
            record_data = %s,
            department = %s
        WHERE record_id = %s
    """, (
        data.get("recordType"),
        data.get("recordData"),
        data.get("department"),
        recordId
    ))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"message": "Medical record updated successfully"}), 200



def seed_admin():
    ADMIN_USER_ID = 100
    ADMIN_EMAIL = "admin@gmail.com"
    ADMIN_PASSWORD = "Admin1234"

    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    # check if admin exists
    cursor.execute("""
        SELECT user_id FROM users WHERE user_id = %s
    """, (ADMIN_USER_ID,))

    if cursor.fetchone():
        print(" Admin already exists")
        cursor.close()
        conn.close()
        return

    password_hash = bcrypt.hashpw(
        ADMIN_PASSWORD.encode(),
        bcrypt.gensalt(12)
    ).decode()

    # insert into users with FIXED ID = 100
    cursor.execute("""
        INSERT INTO users (user_id, username, email, password_hash, role)
        VALUES (%s, %s, %s, %s, 'ADMIN')
    """, (
        ADMIN_USER_ID,
        "admin",
        ADMIN_EMAIL,
        password_hash
    ))

    # insert into admin with SAME ID
    cursor.execute("""
        INSERT INTO admin
        (admin_id, user_id, first_name, last_name, date_of_birth, phone, email, role_description)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
    """, (
        ADMIN_USER_ID,
        ADMIN_USER_ID,
        "System",
        "Admin",
        "1990-01-01",
        "01000000000",
        ADMIN_EMAIL,
        "Super Admin"
    ))

    conn.commit()
    cursor.close()
    conn.close()

    print(" Admin seeded with user_id = 100")


@app.route('/api/admin/login', methods=['POST'])
def adminLogin():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    print("EMAIL FROM FRONT:", email)
    print("PASSWORD FROM FRONT:", password)

    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    cursor.execute("""
        SELECT 
            u.user_id,
            u.email,
            u.password_hash,
            u.role,
            a.admin_id
        FROM users u
        JOIN admin a ON a.user_id = u.user_id
        WHERE u.email = %s
    """, (email,))

    admin = cursor.fetchone()
    print("ADMIN FROM DB:", admin)

    cursor.close()
    conn.close()

    if not admin:
        print("ADMIN NOT FOUND")
        return jsonify({"error": "Invalid credentials"}), 401

    if not bcrypt.checkpw(password.encode(), admin["password_hash"].encode()):
        print("PASSWORD HASH MISMATCH")
        return jsonify({"error": "Invalid credentials"}), 401

    print("LOGIN SUCCESS")

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
        ORDER BY doctor_id ASC
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
    if dob:
        try:
            dob = datetime.strptime(dob, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid date format"}), 400
    else:
        dob = None

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

    mapping = {
        "firstName": "first_name",
        "lastName": "last_name",
        "email": "email",
        "phone": "phone",
        "specialization": "specialization",
        "dateOfBirth": "date_of_birth"
    }

    for key, column in mapping.items():
        if key == "dateOfBirth":
            dob = data.get(key)
            if dob:
                try:
                    dob = datetime.strptime(dob, "%Y-%m-%d").date()
                except ValueError:
                    return jsonify({"error": "Invalid date format"}), 400
            else:
                dob = None

            fields.append(f"{column} = %s")
            values.append(dob)

        elif data.get(key) is not None:
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

@app.route('/api/admin/analytics/overview', methods=['GET'])
def analyticsOverview():
    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Total counts
        cursor.execute("SELECT COUNT(*) AS total FROM patients")
        total_patients = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) AS total FROM doctor")
        total_doctors = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) AS total FROM appointments WHERE status = 'completed'")
        completed_appointments = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) AS total FROM appointments WHERE status = 'scheduled'")
        scheduled_appointments = cursor.fetchone()['total']
        
        # Financial metrics
        cursor.execute("""
            SELECT 
                SUM(amount) AS total_revenue,
                COUNT(*) FILTER (WHERE status = 'paid') AS paid_bills,
                COUNT(*) FILTER (WHERE status = 'pending') AS pending_bills
            FROM billing
        """)
        billing_data = cursor.fetchone()
        
        return jsonify({
            'totalPatients': total_patients,
            'totalDoctors': total_doctors,
            'completedAppointments': completed_appointments,
            'scheduledAppointments': scheduled_appointments,
            'totalRevenue': float(billing_data['total_revenue'] or 0),
            'paidBills': billing_data['paid_bills'],
            'pendingBills': billing_data['pending_bills']
        }), 200
    
    except Exception as e:
        logging.exception("Analytics overview error")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/analytics/appointments-by-month', methods=['GET'])
def appointmentsByMonth():
    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT 
                DATE_TRUNC('month', appointment_date) AS month,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'completed') AS completed,
                COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
            FROM appointments
            WHERE appointment_date >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', appointment_date)
            ORDER BY month DESC
        """)
        
        data = cursor.fetchall()
        formatted_data = [{
            'month': item['month'].strftime('%Y-%m') if item['month'] else None,
            'total': item['total'],
            'completed': item['completed'],
            'cancelled': item['cancelled']
        } for item in data]
        
        return jsonify(formatted_data), 200
    
    except Exception as e:
        logging.exception("Appointments by month error")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/analytics/revenue-by-month', methods=['GET'])
def revenueByMonth():
    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT 
                DATE_TRUNC('month', created_at) AS month,
                SUM(amount) AS total_revenue,
                COUNT(*) FILTER (WHERE status = 'paid') AS paid_count,
                COUNT(*) FILTER (WHERE status = 'pending') AS pending_count
            FROM billing
            WHERE created_at >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month DESC
        """)
        
        data = cursor.fetchall()
        formatted_data = [{
            'month': item['month'].strftime('%Y-%m') if item['month'] else None,
            'revenue': float(item['total_revenue'] or 0),
            'paidCount': item['paid_count'],
            'pendingCount': item['pending_count']
        } for item in data]
        
        return jsonify(formatted_data), 200
    
    except Exception as e:
        logging.exception("Revenue by month error")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/analytics/doctor-performance', methods=['GET'])
def doctorPerformance():
    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT 
                d.doctor_id,
                d.first_name,
                d.last_name,
                d.specialization,
                COUNT(a.appointment_id) AS total_appointments,
                COUNT(a.appointment_id) FILTER (WHERE a.status = 'completed') AS completed_appointments,
                COUNT(a.appointment_id) FILTER (WHERE a.status = 'cancelled') AS cancelled_appointments
            FROM doctor d
            LEFT JOIN appointments a ON d.doctor_id = a.doctor_id
            GROUP BY d.doctor_id, d.first_name, d.last_name, d.specialization
            ORDER BY total_appointments DESC
        """)
        
        data = cursor.fetchall()
        return jsonify(data), 200
    
    except Exception as e:
        logging.exception("Doctor performance error")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/analytics/patient-statistics', methods=['GET'])
def patientStatistics():
    conn = getDbConnection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute("""
            SELECT 
                COUNT(*) AS total_patients,
                COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM age(date_of_birth)) < 18) AS under_18,
                COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM age(date_of_birth)) BETWEEN 18 AND 65) AS age_18_65,
                COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM age(date_of_birth)) > 65) AS over_65,
                COUNT(*) FILTER (WHERE gender = 'male') AS male_count,
                COUNT(*) FILTER (WHERE gender = 'female') AS female_count
            FROM patients
        """)
        
        stats = cursor.fetchone()
        return jsonify(stats), 200
    
    except Exception as e:
        logging.exception("Patient statistics error")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
################################# SYSTEM PERFORMANCE ANALYTICS NOT YET WORKING ###################
# # record process start
# START_TIME = datetime.utcnow()

# # keep simple request stats (last 100 requests)
# REQUEST_DURATIONS = deque(maxlen=200)
# TOTAL_REQUESTS = 0

# # request timing middleware
# @app.before_request
# def _before_request_timing():
#     g._req_start = datetime.utcnow()

# @app.after_request
# def _after_request_timing(response):
#     global TOTAL_REQUESTS
#     try:
#         start = getattr(g, "_req_start", None)
#         if start:
#             dur = (datetime.utcnow() - start).total_seconds()
#             REQUEST_DURATIONS.append(dur)
#             TOTAL_REQUESTS += 1
#     except Exception:
#         pass
#     return response

# @app.route('/api/admin/analytics/system-performance', methods=['GET'])
# def system_performance():
#     conn = None
#     cursor = None
#     try:
#         uptime_seconds = (datetime.utcnow() - START_TIME).total_seconds()
#         avg_response_time = float(sum(REQUEST_DURATIONS) / len(REQUEST_DURATIONS)) if REQUEST_DURATIONS else 0.0
#         recent_requests = len(REQUEST_DURATIONS)
#         total_requests = TOTAL_REQUESTS

#         cpu_percent = None
#         mem_percent = None
#         rss_bytes = None
#         if psutil:
#             try:
#                 p = psutil.Process(os.getpid())
#                 mem = p.memory_info()
#                 rss_bytes = mem.rss
#                 mem_percent = psutil.virtual_memory().percent
#                 cpu_percent = psutil.cpu_percent(interval=0.1)
#             except Exception:
#                 cpu_percent = None
#                 mem_percent = None

#         # active DB connections for this database
#         active_db_connections = None
#         try:
#             conn = getDbConnection()
#             cursor = conn.cursor(cursor_factory=RealDictCursor)
#             cursor.execute("SELECT COUNT(*) AS cnt FROM pg_stat_activity WHERE datname = current_database()")
#             active_db_connections = int(cursor.fetchone()['cnt'] or 0)
#         except Exception:
#             active_db_connections = None

#         return jsonify({
#             "uptime_seconds": int(uptime_seconds),
#             "uptime_readable": str(timedelta(seconds=int(uptime_seconds))),
#             "avg_response_time_seconds": round(avg_response_time, 4),
#             "recent_requests_sample": recent_requests,
#             "total_requests": total_requests,
#             "cpu_percent": cpu_percent,
#             "memory_percent": mem_percent,
#             "rss_bytes": rss_bytes,
#             "active_db_connections": active_db_connections
#         }), 200
#     except Exception as e:
#         logging.exception("Failed to get system performance")
#         return jsonify({"error": str(e)}), 500
#     finally:
#         if cursor: cursor.close()
#         if conn: conn.close()
@app.route('/api/admin/analytics/export-all', methods=['GET'])
def export_all_analytics():
    """Generate comprehensive analytics report as JSON for frontend processing"""
    conn = None
    cursor = None
    try:
        conn = getDbConnection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Fetch all analytics data
        cursor.execute("""
            SELECT 
                COUNT(*) AS total_patients
            FROM patients
        """)
        total_patients = cursor.fetchone()['total_patients']
        
        cursor.execute("""
            SELECT 
                DATE_TRUNC('month', appointment_date) AS month,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'completed') AS completed,
                COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
            FROM appointments
            WHERE appointment_date >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', appointment_date)
            ORDER BY month DESC
        """)
        appointments = cursor.fetchall()
        
        cursor.execute("""
            SELECT 
                DATE_TRUNC('month', created_at) AS month,
                SUM(amount) AS total_revenue,
                COUNT(*) FILTER (WHERE status = 'paid') AS paid_count
            FROM billing
            WHERE created_at >= NOW() - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month DESC
        """)
        revenue = cursor.fetchall()
        
        return jsonify({
            'timestamp': datetime.now().isoformat(),
            'total_patients': total_patients,
            'appointments': appointments,
            'revenue': revenue
        }), 200
    
    except Exception as e:
        logging.exception("Export analytics failed")
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# ---------------- CDSS / Model config ----------------
logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent / "final_binary.keras"   # put final_binary.keras here
IMG_SIZE = 224
BACKBONE_CANDIDATES = ["EfficientNetB0", "MobileNetV3Large", "EfficientNetV2B0"]
ALLOWED_EXT = {"png", "jpg", "jpeg"}
UPLOAD_FOLDER = Path(__file__).parent / "uploads"
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
app.config["UPLOAD_FOLDER"] = str(UPLOAD_FOLDER)

# ---------------- Custom loss (if needed) ----------------
if keras is not None:
    class SparseCategoricalFocalLoss(keras.losses.Loss):
        def __init__(self, gamma=2.0, alpha=None, from_logits=False, reduction='sum_over_batch_size', name='sc_focal'):
            super().__init__(reduction=reduction, name=name)
            self.gamma = gamma
            self.alpha = alpha
            self.from_logits = from_logits

        def call(self, y_true, y_pred):
            y_true = tf.cast(y_true, tf.int32)
            if self.from_logits:
                y_pred = tf.nn.softmax(y_pred, axis=-1)
            else:
                y_pred = tf.clip_by_value(y_pred, 1e-9, 1.0)
            y_true_onehot = tf.one_hot(y_true, depth=tf.shape(y_pred)[-1])
            p_t = tf.reduce_sum(y_true_onehot * y_pred, axis=-1)
            ce = -tf.reduce_sum(y_true_onehot * tf.math.log(y_pred), axis=-1)
            if self.alpha is not None:
                alpha_tensor = tf.convert_to_tensor(self.alpha, dtype=tf.float32)
                alpha_factor = tf.reduce_sum(y_true_onehot * alpha_tensor, axis=-1)
                ce = alpha_factor * ce
            modulating = tf.pow(1.0 - p_t, self.gamma)
            loss = modulating * ce
            return tf.reduce_mean(loss)

    # ---------------- Model build helper ----------------
    def build_model(img_size, num_classes=2, backbone='EfficientNetB0', dropout=0.4):
        inputs = keras.Input(shape=(img_size, img_size, 3), name="input_layer")
        x = inputs
        backbone_lower = backbone.lower()
        if backbone_lower.startswith('mobilenet'):
            base = tf.keras.applications.MobileNetV3Large(include_top=False, weights='imagenet', input_tensor=x)
        elif backbone_lower.startswith('efficientnetv2'):
            base = tf.keras.applications.EfficientNetV2B0(include_top=False, weights='imagenet', input_tensor=x)
        else:
            base = tf.keras.applications.EfficientNetB0(include_top=False, weights='imagenet', input_tensor=x)
        base.trainable = False
        y = base.output
        y = keras.layers.GlobalAveragePooling2D()(y)
        y = keras.layers.BatchNormalization()(y)
        y = keras.layers.Dropout(dropout)(y)
        y = keras.layers.Dense(256, activation='relu')(y)
        y = keras.layers.Dropout(dropout * 0.5)(y)
        outputs = keras.layers.Dense(num_classes, activation='softmax', dtype='float32')(y)
        model = keras.Model(inputs=inputs, outputs=outputs)
        return model

    # ---------------- Robust model loader ----------------
    from typing import Optional

    def try_load_full_model(path: Path) -> Optional[keras.Model]:
        if not path.exists():
            logger.error("Model file not found: %s", path)
            return None
        try:
            logger.info("Attempting keras.models.load_model (normal)...")
            m = keras.models.load_model(str(path), custom_objects={"SparseCategoricalFocalLoss": SparseCategoricalFocalLoss})
            logger.info("Loaded full model (normal).")
            return m
        except Exception as e:
            logger.warning("Normal load failed: %s", e)

        try:
            if hasattr(keras, "config") and hasattr(keras.config, "enable_unsafe_deserialization"):
                logger.info("Trying unsafe deserialization and retrying load_model...")
                keras.config.enable_unsafe_deserialization()
                m = keras.models.load_model(str(path), custom_objects={"SparseCategoricalFocalLoss": SparseCategoricalFocalLoss})
                logger.info("Loaded full model (unsafe).")
                return m
            else:
                logger.info("Unsafe deserialization not available; skipping.")
        except Exception as e:
            logger.warning("Unsafe deserialization attempt failed: %s", e)
        return None

    def infer_num_classes_from_h5(path: str):
        if h5py is None:
            return None
        try:
            with h5py.File(path, 'r') as hf:
                candidate_dims = []
                def visitor(name, node):
                    if isinstance(node, h5py.Dataset):
                        n = name.lower()
                        if 'kernel' in n or 'weights' in n or 'dense' in n:
                            shape = getattr(node, 'shape', None)
                            if shape and len(shape) >= 2:
                                candidate_dims.append(shape[-1])
                hf.visititems(visitor)
                candidate_dims = [int(c) for c in candidate_dims if int(c) > 1]
                if candidate_dims:
                    candidate_dims.sort()
                    guessed = candidate_dims[0]
                    logger.info("Inferred num_classes=%s from h5 inspection", guessed)
                    return guessed
        except Exception as e:
            logger.warning("h5 inspection failed: %s", e)
        return None

    def extract_possible_h5_from_zip(path: str):
        if not zipfile.is_zipfile(path):
            return []
        results = []
        try:
            with zipfile.ZipFile(path, 'r') as z:
                for name in z.namelist():
                    if name.lower().endswith(('.h5', '.hdf5')):
                        tfobj = tempfile.NamedTemporaryFile(delete=False, suffix=Path(name).suffix)
                        tfobj.close()
                        with z.open(name) as src, open(tfobj.name, 'wb') as dst:
                            shutil.copyfileobj(src, dst)
                        results.append(tfobj.name)
                if any(n.startswith('variables/') for n in z.namelist()):
                    td = tempfile.mkdtemp()
                    z.extractall(td)
                    ckpt = tf.train.latest_checkpoint(td)
                    if ckpt:
                        results.append(ckpt)
        except Exception as e:
            logger.warning("zip inspection failed: %s", e)
        return results

    def try_restore_weights(path: Path):
        weight_files = [str(path)]
        weight_files += extract_possible_h5_from_zip(str(path))

        inferred_classes = None
        for wf in weight_files:
            if wf and wf.lower().endswith(('.h5', '.hdf5')):
                inferred = infer_num_classes_from_h5(wf)
                if inferred:
                    inferred_classes = inferred
                    break

        num_classes_candidates = [2] if inferred_classes is None else [inferred_classes]
        num_classes_candidates += [2, 3, 4, 5]
        seen = set()
        num_classes_candidates = [x for x in num_classes_candidates if not (x in seen or seen.add(x))]

        for num_classes in num_classes_candidates:
            for backbone in BACKBONE_CANDIDATES:
                try:
                    logger.info("Trying backbone=%s num_classes=%s", backbone, num_classes)
                    model = build_model(IMG_SIZE, num_classes=num_classes, backbone=backbone)
                    for wf in weight_files:
                        try:
                            logger.info("Attempting model.load_weights(%s)", wf)
                            model.load_weights(wf)
                            logger.info("Loaded weights into constructed model (backbone=%s classes=%s)", backbone, num_classes)
                            return model
                        except Exception as e:
                            logger.warning("load_weights(%s) failed: %s", wf, e)
                except Exception as e:
                    logger.warning("Failed building/loading for backbone %s classes %s: %s", backbone, num_classes, e)
        return None

    def load_model_aggressive(path: Path):
        if not path.exists():
            return None, "model file not found"

        m = try_load_full_model(path)
        if m is not None:
            return m, None

        try:
            m2 = try_restore_weights(path)
            if m2 is not None:
                return m2, None
        except Exception as e:
            logger.exception("try_restore_weights raised exception")

        try:
            if path.is_dir():
                try:
                    sm = tf.keras.models.load_model(str(path))
                    return sm, None
                except Exception as e:
                    logger.warning("tf.saved_model.load attempt failed: %s", e)
        except Exception:
            pass

        return None, "all model loading attempts failed"

    MODEL = None
    MODEL_READY = False
    preprocess_fn = None
    NUM_OUT = None
    CLASS_MAP = {}

    def initialize_model():
        global MODEL, MODEL_READY, preprocess_fn, NUM_OUT, CLASS_MAP
        m, err = load_model_aggressive(MODEL_PATH)
        if m is None:
            logger.error("Model initialization failed: %s", err)
            MODEL = None
            MODEL_READY = False
            preprocess_fn = None
            NUM_OUT = None
            CLASS_MAP = {}
            return

        MODEL = m
        MODEL_READY = True
        contains_lambda = any(isinstance(layer, keras.layers.Lambda) for layer in MODEL.layers)
        if contains_lambda:
            preprocess_fn = None
            logger.info("Model contains Lambda layer(s); skipping external preprocess.")
        else:
            preprocess_fn = None
            try:
                preprocess_fn = tf.keras.applications.efficientnet.preprocess_input
                logger.info("Using EfficientNet preprocess_input.")
            except Exception:
                try:
                    preprocess_fn = tf.keras.applications.efficientnet_v2.preprocess_input
                    logger.info("Using EfficientNetV2 preprocess_input.")
                except Exception:
                    try:
                        preprocess_fn = tf.keras.applications.mobilenet_v3.preprocess_input
                        logger.info("Using MobileNetV3 preprocess_input.")
                    except Exception:
                        preprocess_fn = None
                        logger.info("No preprocess_input available; will pass raw arrays.")

        try:
            NUM_OUT = MODEL.output_shape[-1] if hasattr(MODEL, "output_shape") else None
        except Exception:
            NUM_OUT = None
        try:
            if NUM_OUT == 2 or NUM_OUT is None:
                CLASS_MAP = {0: "Healthy (neg)", 1: "Osteoarthritis - OA (pos)"}
            else:
                CLASS_MAP = {i: f"Class {i}" for i in range(NUM_OUT)}
        except Exception:
            CLASS_MAP = {}
        logger.info("Model loaded. NUM_OUT=%s", NUM_OUT)

    # ---------------- Preprocessing & prediction helpers ----------------
    def allowed_file(filename: str):
        return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT

    def preprocess_pil_image(img: Image.Image, img_size=IMG_SIZE):
        if img.mode != "RGB":
            img = img.convert("RGB")
        img = img.resize((img_size, img_size), Image.LANCZOS)
        arr = np.asarray(img).astype(np.float32)
        if preprocess_fn is not None:
            arr = preprocess_fn(arr)
        arr = np.expand_dims(arr, axis=0)
        return arr

    def predict_from_array(arr: np.ndarray):
        preds = MODEL.predict(arr, verbose=0)
        preds = np.asarray(preds)
        if preds.ndim == 2 and (preds.min() < 0 or preds.max() > 1.0001 or not np.isclose(preds.sum(axis=1)[0], 1.0, atol=1e-3)):
            exp = np.exp(preds - np.max(preds, axis=1, keepdims=True))
            preds = exp / np.sum(exp, axis=1, keepdims=True)
        probs = preds[0]
        idx = int(np.argmax(probs))
        conf = float(probs[idx])
        label = CLASS_MAP.get(idx, str(idx))
        return label, conf, probs.tolist()

    # ---------------- CDSS endpoints ----------------
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "model_ready": bool(MODEL_READY)})

    @app.route("/api/model_status", methods=["GET"])
    def model_status():
        return jsonify({
            "model_path": str(MODEL_PATH),
            "model_ready": bool(MODEL_READY),
            "num_output_classes": NUM_OUT,
            "class_map": CLASS_MAP
        }), 200

    @app.route("/api/predict", methods=["POST"])
    def api_predict():
        if MODEL is None or not MODEL_READY:
            return jsonify({"error": "Model not loaded. Check /api/model_status for details."}), 503

        if "file" not in request.files:
            return jsonify({"error": "no file part"}), 400
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "no selected file"}), 400
        if not allowed_file(file.filename):
            return jsonify({"error": f"allowed file types: {', '.join(ALLOWED_EXT)}"}), 400

        ext = file.filename.rsplit(".", 1)[1].lower()
        filename = f"{uuid4().hex}.{ext}"
        save_path = UPLOAD_FOLDER / filename

        file_bytes = file.read()
        try:
            img = Image.open(io.BytesIO(file_bytes))
            img.verify()
        except Exception as e:
            logger.warning("Uploaded file not valid image: %s", e)
            return jsonify({"error": "uploaded file is not a valid image"}), 400

        try:
            img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        except Exception as e:
            logger.exception("Failed to reopen image")
            return jsonify({"error": "failed to process uploaded image"}), 400

        try:
            img.save(save_path)
        except Exception as e:
            logger.exception("Failed to save uploaded image")
            save_path = None

        arr = preprocess_pil_image(img, IMG_SIZE)
        try:
            label, conf, probs = predict_from_array(arr)
        except Exception as e:
            logger.exception("Model prediction failed")
            return jsonify({"error": f"Model prediction error: {str(e)}"}), 500

        try:
            image_url = url_for("uploaded_file", filename=filename, _external=True) if save_path else None
        except Exception:
            image_url = f"/uploads/{filename}" if save_path else None

        return jsonify({
            "label": label,
            "confidence": float(conf),
            "probs": [float(p) for p in probs],
            "filename": filename if save_path else None,
            "image_url": image_url
        }), 200

    @app.route("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    # Initialize model on startup
    initialize_model()
#################################################################
if __name__ == '__main__':
    # seed_admin()
    print("=" * 60)
    print("CDSS MODEL STATUS:")
    print(f"  Model path: {MODEL_PATH}")
    print(f"  Model exists: {MODEL_PATH.exists()}")
    if keras is not None:
        print(f"  Model ready: {MODEL_READY}")
        print(f"  Num classes: {NUM_OUT}")
        print(f"  Class map: {CLASS_MAP}")
    else:
        print("  TensorFlow/Keras not available")
    print("=" * 60)
    app.run(debug=True)