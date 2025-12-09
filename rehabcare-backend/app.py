# app.py
import logging
from datetime import datetime

import bcrypt
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify
from flask_cors import CORS

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
CORS(app)

# ====== DB CONFIG  ======
DB_CONFIG = {
    "dbname": "rehabcare_db",
    "user": "postgres",
    "password": "Admin@123",  
    "host": "localhost",
    "port": "5432",
}


def get_db_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        raise Exception(f"Database connection failed: {str(e)}")


# ===============================================================
# ================  AUTH (REGISTER + LOGIN)  ====================
# ===============================================================

@app.route("/api/register", methods=["POST"])
def register_patient():
    try:
        data = request.get_json() or {}

        first_name = data.get("first_name") or data.get("firstName")
        last_name = data.get("last_name") or data.get("lastName")
        email = (data.get("email") or "").lower()
        password = data.get("password")
        date_of_birth = data.get("date_of_birth") or data.get("dateOfBirth")
        phone_number = data.get("phone_number") or data.get("phoneNumber")
        gender = data.get("gender")

        if not all([first_name, last_name, email, password]):
            return jsonify({"error": "Missing required fields"}), 400

        # Hash password
        password_hash = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # --------------------------------------
        # 1) Insert into USERS TABLE
        # --------------------------------------
        cursor.execute("""
            INSERT INTO users (username, password_hash, email, role)
            VALUES (%s, %s, %s, %s)
            RETURNING user_id
        """, (
            email,
            password_hash,
            email,
            "PATIENT"
        ))

        user_id = cursor.fetchone()["user_id"]

        # --------------------------------------
        # 2) Insert into PATIENTS TABLE
        # patient_id = user_id
        # --------------------------------------
        cursor.execute("""
            INSERT INTO patients
                (patient_id, first_name, last_name, date_of_birth,
                 phone_number, gender)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING patient_id
        """, (
            user_id,      # 👈 SAME ID
            first_name,
            last_name,
            date_of_birth,
            phone_number,
            gender
        ))

        patient_id = cursor.fetchone()["patient_id"]

        conn.commit()

        return jsonify({
            "message": "Registration successful",
            "userId": user_id,
            "patientId": patient_id
        }), 201

    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return jsonify({"error": "Email already exists"}), 400

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/register-doctor', methods=['POST'])
def register_doctor():
    try:
        data = request.get_json() or {}

        first_name = data.get("first_name")
        last_name = data.get("last_name")
        email = (data.get("email") or "").lower()
        password = data.get("password")
        specialization = data.get("specialization")
        phone = data.get("phone")
        date_of_birth = data.get("date_of_birth")

        if not all([first_name, last_name, email, password]):
            return jsonify({"error": "Missing required fields"}), 400

        # Hash password
        password_hash = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # ------------------------------
        # 1) Create user in USERS TABLE
        # ------------------------------
        cursor.execute("""
            INSERT INTO users (username, password_hash, email, role)
            VALUES (%s, %s, %s, %s)
            RETURNING user_id
        """, (
            email,
            password_hash,
            email,
            "DOCTOR"
        ))

        user_id = cursor.fetchone()["user_id"]

        # ------------------------------
        # 2) Create profile in DOCTORS TABLE
        # doctor_id = user_id
        # ------------------------------
        cursor.execute("""
            INSERT INTO doctors
                (doctor_id, first_name, last_name, email,
                 specialization, phone, date_of_birth)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING doctor_id
        """, (
            user_id,     # 👈 SAME ID
            first_name,
            last_name,
            email,
            specialization,
            phone,
            date_of_birth
        ))

        doctor_id = cursor.fetchone()["doctor_id"]

        conn.commit()

        return jsonify({
            "message": "Doctor registered successfully",
            "userId": user_id,
            "doctorId": doctor_id
        }), 201

    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return jsonify({"error": "Email already exists"}), 400

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()



@app.route("/api/login", methods=["POST"])
def login():
    """
    Login endpoint
    Body: { email, password }
    Response:
      {
        "message": "Login successful",
        "userId": 1,
        "role": "PATIENT",
        "patientId": 1,
        "doctorId": null,
        "adminId": null
      }
    """
    conn = None
    cursor = None

    try:
        data = request.get_json() or {}

        email = (data.get("email") or "").lower()
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Missing email or password"}), 400

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # -----------------------------------
        # 1) FETCH USER DATA
        # -----------------------------------
        cursor.execute("""
            SELECT user_id, username, email, password_hash, role
            FROM users
            WHERE email = %s
        """, (email,))

        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "Invalid email or password"}), 401

        # Validate password
        stored_hash = user["password_hash"].encode("utf-8")
        if not bcrypt.checkpw(password.encode("utf-8"), stored_hash):
            return jsonify({"error": "Invalid email or password"}), 401

        user_id = user["user_id"]
        role = user["role"]

        # -----------------------------------
        # 2) GET PROFILE ID BASED ON ROLE
        # Because now: patient_id = user_id
        #              doctor_id  = user_id
        #              admin_id   = user_id
        # -----------------------------------
        patient_id = doctor_id = admin_id = None

        if role == "PATIENT":
            # patient_id = user_id directly
            cursor.execute("""
                SELECT patient_id FROM patients WHERE patient_id = %s
            """, (user_id,))
            row = cursor.fetchone()
            patient_id = row["patient_id"] if row else None

        elif role == "DOCTOR":
            cursor.execute("""
                SELECT doctor_id FROM doctors WHERE doctor_id = %s
            """, (user_id,))
            row = cursor.fetchone()
            doctor_id = row["doctor_id"] if row else None

        elif role == "ADMIN":
            cursor.execute("""
                SELECT admin_id FROM admins WHERE admin_id = %s
            """, (user_id,))
            row = cursor.fetchone()
            admin_id = row["admin_id"] if row else None

        # -----------------------------------
        # SUCCESS
        # -----------------------------------
        return jsonify({
            "message": "Login successful",
            "userId": user_id,
            "role": role,
            "patientId": patient_id,
            "doctorId": doctor_id,
            "adminId": admin_id
        }), 200

    except Exception as e:
        logging.exception("Login error")
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ===============================================================
# ================  PATIENT PROFILE (GET / PUT)  ===============
# ===============================================================

@app.route("/api/patients/<int:patient_id>", methods=["GET", "PUT"])
def manage_patient_profile(patient_id):
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # ============================================
        # GET PATIENT PROFILE
        # ============================================
        if request.method == "GET":
            cursor.execute("""
                SELECT 
                    p.patient_id,
                    p.first_name,
                    p.last_name,
                    u.email,
                    TO_CHAR(p.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
                    p.phone_number,
                    p.gender,
                    p.created_at
                FROM patients p
                JOIN users u ON u.user_id = p.patient_id
                WHERE p.patient_id = %s
            """, (patient_id,))

            patient = cursor.fetchone()

            if not patient:
                return jsonify({"error": "Patient not found"}), 404

            return jsonify(patient), 200

        # ============================================
        # UPDATE PATIENT PROFILE
        # ============================================
        data = request.get_json() or {}

        first_name = data.get("first_name") or data.get("firstName")
        last_name = data.get("last_name") or data.get("lastName")
        date_of_birth = data.get("date_of_birth") or data.get("dateOfBirth")
        phone_number = data.get("phone_number") or data.get("phoneNumber")
        gender = data.get("gender")

        fields = []
        values = []

        if first_name is not None:
            fields.append("first_name = %s")
            values.append(first_name)

        if last_name is not None:
            fields.append("last_name = %s")
            values.append(last_name)

        if date_of_birth is not None:
            fields.append("date_of_birth = %s")
            values.append(date_of_birth)

        if phone_number is not None:
            fields.append("phone_number = %s")
            values.append(phone_number)

        if gender is not None:
            fields.append("gender = %s")
            values.append(gender)

        if not fields:
            return jsonify({"error": "No fields to update"}), 400

        values.append(patient_id)

        sql = f"""
            UPDATE patients
            SET {', '.join(fields)}
            WHERE patient_id = %s
            RETURNING
                patient_id,
                first_name,
                last_name,
                TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
                phone_number,
                gender,
                created_at
        """

        cursor.execute(sql, tuple(values))
        updated = cursor.fetchone()
        conn.commit()

        if not updated:
            return jsonify({"error": "Patient not found"}), 404

        # Add email from users in response
        cursor.execute("""
            SELECT email FROM users WHERE user_id = %s
        """, (patient_id,))
        email_row = cursor.fetchone()

        updated["email"] = email_row["email"]

        return jsonify(updated), 200

    except Exception as e:
        logging.exception("Patient profile error")
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ===============================================================
# ====================  APPOINTMENTS  ==========================
# ===============================================================

# POST: create  |  GET /api/appointments/<patientId>: list for patient
@app.route("/api/appointments", methods=["POST"])
@app.route("/api/appointments/<int:patient_id>", methods=["GET"])
def manage_appointments(patient_id=None):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        if request.method == "POST":
            data = request.get_json() or {}
            patient_id = data.get("patientId")
            appointment_date = data.get("appointmentDate")
            appointment_time = data.get("appointmentTime")
            purpose = data.get("purpose")
            doctor_id = data.get("doctor_id") or data.get("doctorId")
            notes = data.get("notes")

            if not all([patient_id, appointment_date, purpose]):
                return jsonify({"error": "Missing required fields"}), 400

            # Normalize optional
            appointment_time = (
                appointment_time if appointment_time and str(appointment_time).strip() else None
            )
            doctor_id = doctor_id if doctor_id else None
            notes = notes if notes else None

            cursor.execute(
                """
                INSERT INTO appointments
                  (patient_id, doctor_id, appointment_date,
                   appointment_time, purpose, notes, status, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, 'scheduled', NOW())
                RETURNING
                  appointment_id,
                  patient_id,
                  doctor_id,
                  appointment_date,
                  TO_CHAR(appointment_time, 'HH24:MI:SS') AS appointment_time,
                  purpose,
                  notes,
                  status
                """,
                (patient_id, doctor_id, appointment_date, appointment_time, purpose, notes),
            )
            row = cursor.fetchone()
            conn.commit()
            return jsonify(row), 201

        # GET = appointments for patient
        cursor.execute(
            """
            SELECT
              appointment_id,
              patient_id,
              doctor_id,
              appointment_date,
              TO_CHAR(appointment_time, 'HH24:MI:SS') AS appointment_time,
              purpose,
              notes,
              status,
              created_at
            FROM appointments
            WHERE patient_id = %s
            ORDER BY appointment_date DESC, appointment_time DESC NULLS LAST
            """,
            (patient_id,),
        )
        rows = cursor.fetchall()
        return jsonify(rows), 200

    except Exception as e:
        logging.exception("Appointment management error")
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/appointments/<int:appointment_id>", methods=["PUT"])
def update_appointment(appointment_id):
    conn = None
    cursor = None
    try:
        data = request.get_json() or {}
        appointment_date = data.get("appointmentDate")
        appointment_time = data.get("appointmentTime")
        purpose = data.get("purpose")
        doctor_id = data.get("doctor_id") or data.get("doctorId")
        notes = data.get("notes")

        fields = []
        values = []

        if appointment_date is not None:
            fields.append("appointment_date = %s")
            values.append(appointment_date)
        if appointment_time is not None:
            fields.append("appointment_time = %s")
            values.append(appointment_time)
        if purpose is not None:
            fields.append("purpose = %s")
            values.append(purpose)
        if doctor_id is not None:
            fields.append("doctor_id = %s")
            values.append(doctor_id)
        if notes is not None:
            fields.append("notes = %s")
            values.append(notes)

        if not fields:
            return jsonify({"error": "No fields to update"}), 400

        values.append(appointment_id)

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        sql = f"""
            UPDATE appointments
            SET {', '.join(fields)}
            WHERE appointment_id = %s
            RETURNING
              appointment_id,
              patient_id,
              doctor_id,
              appointment_date,
              TO_CHAR(appointment_time, 'HH24:MI:SS') AS appointment_time,
              purpose,
              notes,
              status
        """
        cursor.execute(sql, tuple(values))
        row = cursor.fetchone()
        conn.commit()

        if not row:
            return jsonify({"error": "Appointment not found"}), 404

        return jsonify(row), 200

    except Exception as e:
        logging.exception("Update appointment error")
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/appointments/<int:appointment_id>/cancel", methods=["PUT"])
def cancel_appointment(appointment_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
            UPDATE appointments
            SET status = 'cancelled'
            WHERE appointment_id = %s
            RETURNING appointment_id, status
            """,
            (appointment_id,),
        )
        row = cursor.fetchone()
        conn.commit()

        if not row:
            return jsonify({"error": "Appointment not found"}), 404

        return (
            jsonify(
                {
                    "message": "Appointment cancelled successfully",
                    "appointment_id": row["appointment_id"],
                }
            ),
            200,
        )

    except Exception as e:
        logging.exception("Cancel appointment error")
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ===============================================================
# ==================  MEDICAL RECORDS (GET)  ===================
# ===============================================================

@app.route("/api/medical-records/<int:patient_id>", methods=["GET"])
def get_medical_records(patient_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
            SELECT
              record_id,
              patient_id,
              record_type,
              record_data,
              TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
              created_by,
              TO_CHAR(visit_date, 'YYYY-MM-DD') AS visit_date,
              department
            FROM medical_records
            WHERE patient_id = %s
            ORDER BY visit_date DESC NULLS LAST, created_at DESC NULLS LAST
            """,
            (patient_id,),
        )
        rows = cursor.fetchall()
        return jsonify(rows), 200

    except Exception as e:
        logging.exception("Get medical records error")
        return jsonify({"error": f"Failed to fetch medical records: {str(e)}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ===============================================================
# =================  PRESCRIPTIONS / TREATMENT  ================
# ===============================================================

def _get_prescriptions_internal(patient_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
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
            """,
            (patient_id,),
        )
        all_prescriptions = cursor.fetchall()

        medications = [
            p
            for p in all_prescriptions
            if (p.get("type") or "").lower() in ["medication", "med", ""]
        ]
        exercises = [
            p
            for p in all_prescriptions
            if (p.get("type") or "").lower() in ["exercise", "physio", "therapy"]
        ]

        return {"medications": medications, "exercises": exercises}

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/prescriptions/<int:patient_id>", methods=["GET"])
def get_prescriptions_route(patient_id):
    try:
        data = _get_prescriptions_internal(patient_id)
        return jsonify(data), 200
    except Exception as e:
        logging.exception("Failed to fetch prescriptions")
        return jsonify({"error": f"Failed to fetch prescriptions: {str(e)}"}), 500


@app.route("/api/prescriptions/<int:prescription_id>", methods=["PUT"])
def update_prescription_status(prescription_id):
    conn = None
    cursor = None
    try:
        data = request.get_json() or {}
        new_status = data.get("status")

        if not new_status:
            return jsonify({"error": "Status is required"}), 400

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(
            """
            UPDATE prescriptions
            SET status = %s
            WHERE prescription_id = %s
            RETURNING prescription_id, status
            """,
            (new_status, prescription_id),
        )
        row = cursor.fetchone()
        conn.commit()

        if not row:
            return jsonify({"error": "Prescription not found"}), 404

        return jsonify(row), 200

    except Exception as e:
        logging.exception("Failed to update prescription status")
        return jsonify({"error": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ===============================================================
# ======================  BILLING  =============================
# ===============================================================
@app.route("/api/billing", methods=["POST"])
@app.route("/api/billing/<int:patient_id>", methods=["GET"])
def manage_billing(patient_id=None):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # ================================
        # POST: Create a new billing record
        # ================================
        if request.method == "POST":
            data = request.get_json() or {}

            patient_id = data.get("patientId")
            amount = data.get("amount")
            due_date = data.get("dueDate")
            appointment_id = data.get("appointmentId")
            icd10_code = data.get("icd10Code")
            insurance_company = data.get("insuranceCompany")

            if not all([patient_id, amount, due_date]):
                return jsonify({"error": "Missing required fields"}), 400

            cursor.execute("""
                INSERT INTO billing
                    (patient_id, amount, due_date, status, created_at,
                     appointment_id, icd10_code, insurance_company)
                VALUES (%s, %s, %s, 'pending', NOW(),
                        %s, %s, %s)
                RETURNING billing_id, amount, due_date, status
            """, (
                patient_id,
                amount,
                due_date,
                appointment_id,
                icd10_code,
                insurance_company
            ))

            row = cursor.fetchone()
            conn.commit()
            return jsonify(row), 201

        # ================================
        # GET: Billing records for a patient
        # ================================
        cursor.execute("""
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
                u.email
            FROM billing b
            JOIN patients p ON p.patient_id = b.patient_id
            JOIN users u ON u.user_id = p.patient_id
            WHERE b.patient_id = %s
            ORDER BY b.created_at DESC
        """, (patient_id,))

        rows = cursor.fetchall()
        return jsonify(rows), 200

    except Exception as e:
        logging.exception("Billing management error")
        return jsonify({"error": f"Billing management failed: {str(e)}"}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route("/api/doctor/<int:doctor_id>/patients", methods=["GET"])
def doctor_get_patients(doctor_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT DISTINCT
                p.patient_id,
                u.email,
                p.first_name,
                p.last_name,
                p.phone_number,
                p.gender,
                TO_CHAR(p.date_of_birth, 'YYYY-MM-DD') AS date_of_birth
            FROM appointments a
            JOIN patients p ON p.patient_id = a.patient_id
            JOIN users u ON u.user_id = p.patient_id
            WHERE a.doctor_id = %s
            ORDER BY p.first_name ASC
        """, (doctor_id,))

        rows = cursor.fetchall()
        return jsonify(rows), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@app.route("/api/doctor/appointments", methods=["GET"])
def doctor_appointments():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT 
                a.appointment_id,
                a.patient_id,
                a.doctor_id,
                p.first_name,
                p.last_name,
                TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date,
                TO_CHAR(a.appointment_time, 'HH24:MI:SS') AS appointment_time,
                a.purpose,
                a.status
            FROM appointments a
            JOIN patients p ON a.patient_id = p.patient_id
            ORDER BY a.appointment_date DESC, a.appointment_time DESC NULLS LAST
        """)

        rows = cursor.fetchall()
        return jsonify(rows), 200

    except Exception as e:
        logging.exception("Doctor appointments error")
        return jsonify({"error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route("/api/doctor/radiology", methods=["GET"])
def doctor_radiology():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT 
                scan_id,
                patient_id,
                file_path,
                scan_type,
                upload_date,
                analyzed
            FROM radiology_scan
            ORDER BY upload_date DESC
        """)

        rows = cursor.fetchall()
        return jsonify(rows), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/doctor/cdss-results", methods=["GET"])
def doctor_cdss_results():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT 
                cdss_id,
                scan_id,
                analysis_summary,
                diagnostic_suggestions,
                confidence_score,
                generated_on
            FROM cdss_result
            ORDER BY generated_on DESC
        """)

        rows = cursor.fetchall()
        return jsonify(rows), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/api/doctor/reports", methods=["GET"])
def doctor_reports():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT 
                report_id,
                doctor_id,
                title,
                content,
                created_on
            FROM reports
            ORDER BY created_on DESC
        """)

        rows = cursor.fetchall()
        return jsonify(rows), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ===============================================================
# =========== DATABASE INITIALIZATION (TABLES) =================
# ===============================================================

# def initialize_database():
#     conn = None
#     cursor = None
#     try:
#         conn = get_db_connection()
#         cursor = conn.cursor()

#         # User
#         cursor.execute(
#             """
#             CREATE TABLE IF NOT EXISTS "User" (
#                 user_id SERIAL PRIMARY KEY,
#                 username VARCHAR(100),
#                 password_hash VARCHAR(255) NOT NULL,
#                 email VARCHAR(255) UNIQUE NOT NULL,
#                 role VARCHAR(50) NOT NULL
#             );
#             """
#         )

#         # Patient
#         cursor.execute(
#             """
#             CREATE TABLE IF NOT EXISTS "Patient" (
#                 patient_id SERIAL PRIMARY KEY,
#                 first_name VARCHAR(100),
#                 last_name VARCHAR(100),
#                 email VARCHAR(255) UNIQUE NOT NULL,
#                 password_hash VARCHAR(255) NOT NULL,
#                 date_of_birth DATE,
#                 created_at TIMESTAMP DEFAULT NOW(),
#                 phone_number VARCHAR(50),
#                 gender VARCHAR(20)
#             );
#             """
#         )

#         # Doctor
#         cursor.execute(
#             """
#             CREATE TABLE IF NOT EXISTS "Doctor" (
#                 doctor_id SERIAL PRIMARY KEY,
#                 user_id INTEGER REFERENCES "User"(user_id),
#                 first_name VARCHAR(100),
#                 last_name VARCHAR(100),
#                 date_of_birth DATE,
#                 specialization VARCHAR(255),
#                 phone VARCHAR(50),
#                 email VARCHAR(255)
#             );
#             """
#         )

#         # Admin
#         cursor.execute(
#             """
#             CREATE TABLE IF NOT EXISTS "Admin" (
#                 admin_id INTEGER PRIMARY KEY,
#                 user_id INTEGER REFERENCES "User"(user_id),
#                 first_name VARCHAR(100),
#                 last_name VARCHAR(100),
#                 date_of_birth DATE,
#                 phone VARCHAR(50),
#                 email VARCHAR(255),
#                 role_description VARCHAR(255)
#             );
#             """
#         )

#         # Billing
#         cursor.execute(
#             """
#             CREATE TABLE IF NOT EXISTS billing (
#                 billing_id SERIAL PRIMARY KEY,
#                 patient_id INTEGER REFERENCES "Patient"(patient_id),
#                 amount NUMERIC(10,2),
#                 status VARCHAR(50),
#                 due_date DATE,
#                 created_at TIMESTAMP DEFAULT NOW(),
#                 appointment_id INTEGER,
#                 icd10_code VARCHAR(50),
#                 insurance_company VARCHAR(255),
#                 payment_method VARCHAR(50)
#             );
#             """
#         )

#         # RadiologyScan
#         cursor.execute(
#             """
#             CREATE TABLE IF NOT EXISTS "RadiologyScan" (
#                 scan_id INTEGER PRIMARY KEY,
#                 patient_id INTEGER REFERENCES "Patient"(patient_id),
#                 file_path VARCHAR(500),
#                 scan_type VARCHAR(100),
#                 upload_date DATE,
#                 analyzed BOOLEAN
#             );
#             """
#         )

#         # CDSSResult
#         cursor.execute(
#             """
#             CREATE TABLE IF NOT EXISTS "CDSSResult" (
#                 cdss_id INTEGER PRIMARY KEY,
#                 scan_id INTEGER REFERENCES "RadiologyScan"(scan_id),
#                 analysis_summary TEXT,
#                 diagnostic_suggestions TEXT,
#                 confidence_score DOUBLE PRECISION,
#                 generated_on DATE
#             );
#             """
#         )

#         # Annotation
#         cursor.execute(
#             """
#             CREATE TABLE IF NOT EXISTS "Annotation" (
#                 annotation_id INTEGER PRIMARY KEY,
#                 scan_id INTEGER REFERENCES "RadiologyScan"(scan_id),
#                 doctor_id INTEGER REFERENCES "Doctor"(doctor_id),
#                 coordinates VARCHAR(500),
#                 note_text TEXT,
#                 timestamp TIMESTAMP
#             );
#             """
#         )

#         # Report
#         cursor.execute(
#             """
#             CREATE TABLE IF NOT EXISTS "Report" (
#                 report_id INTEGER PRIMARY KEY,
#                 doctor_id INTEGER REFERENCES "Doctor"(doctor_id),
#                 title VARCHAR(255),
#                 content TEXT,
#                 created_on DATE
#             );
#             """
#         )

#         # Appointments
#         cursor.execute(
#             """
#             CREATE TABLE IF NOT EXISTS appointments (
#                 appointment_id SERIAL PRIMARY KEY,
#                 patient_id INTEGER REFERENCES "Patient"(patient_id),
#                 doctor_id INTEGER,
#                 appointment_date DATE,
#                 appointment_time TIME,
#                 purpose TEXT,
#                 notes TEXT,
#                 status VARCHAR(50),
#                 created_at TIMESTAMP DEFAULT NOW()
#             );
#             """
#         )

#         # Medical Records
#         cursor.execute(
#             """
#             CREATE TABLE IF NOT EXISTS medical_records (
#                 record_id SERIAL PRIMARY KEY,
#                 patient_id INTEGER REFERENCES "Patient"(patient_id),
#                 record_type VARCHAR(100),
#                 record_data TEXT,
#                 created_at TIMESTAMP DEFAULT NOW(),
#                 created_by INTEGER,
#                 visit_date DATE,
#                 department VARCHAR(100)
#             );
#             """
#         )

#         # Prescriptions
#         cursor.execute(
#             """
#             CREATE TABLE IF NOT EXISTS prescriptions (
#                 prescription_id SERIAL PRIMARY KEY,
#                 patient_id INTEGER REFERENCES "Patient"(patient_id),
#                 medication_name VARCHAR(255),
#                 dosage VARCHAR(100),
#                 instructions TEXT,
#                 issued_date DATE DEFAULT CURRENT_DATE,
#                 frequency VARCHAR(100),
#                 duration VARCHAR(100),
#                 status VARCHAR(50),
#                 type VARCHAR(50)
#             );
#             """
#         )

#         conn.commit()
#         print("✅ Database initialized / verified.")

#     except Exception as e:
#         logging.exception("Database initialization failed")
#     finally:
#         if cursor:
#             cursor.close()
#         if conn:
#             conn.close()


# ===============================================================
# ======================  MAIN  ================================
# ===============================================================

if __name__ == "__main__":
    # initialize_database()
    app.run(debug=True)
