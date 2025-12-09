// src/pages/doctor/PatientDetails.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import "./PatientDetails.css";
import MedicalRecords from "../../pages/patient/MedicalRecords";
import Prescriptions from "../../pages/patient/Prescriptions";
import Billing from "../../pages/patient/Billing";

function PatientDetails() {
  const { patientId } = useParams();
  const [patient, setPatient] = useState({});
  const [activeTab, setActiveTab] = useState("info");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPatient();
  }, [patientId]);

  const fetchPatient = async () => {
    try {
      const res = await axios.get(`http://127.0.0.1:5000/api/patients/${patientId}`);
      setPatient(res.data);
    } catch (err) {
      setError("Failed to load patient details");
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case "records":
        return <MedicalRecords patientId={patientId} />;
      case "prescriptions":
        return <Prescriptions patientId={patientId} />;
      case "billing":
        return <Billing patientId={patientId} />;
      default:
        return (
          <div className="patient-info">
            <h3>Basic Information</h3>
            <p><strong>Name:</strong> {patient.first_name} {patient.last_name}</p>
            <p><strong>Email:</strong> {patient.email}</p>
            <p><strong>Phone:</strong> {patient.phone_number}</p>
            <p><strong>Gender:</strong> {patient.gender}</p>
            <p><strong>DOB:</strong> {patient.date_of_birth}</p>
          </div>
        );
    }
  };

  return (
    <div className="doctor-patient-container">
      <h2>Patient Details</h2>

      {error && <p className="error-message">{error}</p>}

      <div className="patient-tabs">
        <button className={activeTab === "info" ? "active" : ""} onClick={() => setActiveTab("info")}>
          Info
        </button>

        <button className={activeTab === "records" ? "active" : ""} onClick={() => setActiveTab("records")}>
          Records
        </button>

        <button className={activeTab === "prescriptions" ? "active" : ""} onClick={() => setActiveTab("prescriptions")}>
          Prescriptions
        </button>

        <button className={activeTab === "billing" ? "active" : ""} onClick={() => setActiveTab("billing")}>
          Billing
        </button>
      </div>

      <div className="patient-details-content">
        {renderTab()}
      </div>
    </div>
  );
}

export default PatientDetails;
