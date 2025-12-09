// src/pages/doctor/PatientList.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./PatientList.css";

function PatientList() {
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      // Get doctorId from localStorage (saved after login)
      const doctorId = localStorage.getItem("doctorId");

      if (!doctorId) {
        setError("Doctor ID not found. Please login again.");
        return;
      }

      const res = await axios.get(
        `http://127.0.0.1:5000/api/doctor/${doctorId}/patients`
      );

      setPatients(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load patients");
    }
  };

  return (
    <div className="patient-list-container">
      <h3>Patients</h3>

      {error && <p className="error-message">{error}</p>}

      <div className="patient-grid">
        {patients.map((p) => (
          <div key={p.patient_id} className="patient-card">
            <h4>
              {p.first_name} {p.last_name}
            </h4>
            <p>
              <strong>Email:</strong> {p.email}
            </p>
            <p>
              <strong>Phone:</strong> {p.phone_number}
            </p>

            <a className="details-button" href={`/doctor/patient/${p.patient_id}`}>
              View Details
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PatientList;
