// src/pages/doctor/DoctorDashboard.css
import React, { useState } from "react";
import PatientList from "./PatientList";
import AppointmentSchedule from "./AppointmentSchedule";
import RadiologyViewer from "./RadiologyViewer";
import Reports from "./Reports";
import CDSSResult from "./CDSSResult";
import "./DoctorDashboard.css";

function DoctorDashboard() {
  const [activeTab, setActiveTab] = useState("patients");

  const renderTab = () => {
    switch (activeTab) {
      case "patients":
        return <PatientList />;
      case "appointments":
        return <AppointmentSchedule />;
      case "radiology":
        return <RadiologyViewer />;
      case "reports":
        return <Reports />;
      case "cdss":
        return <CDSSResult />;
      default:
        return <PatientList />;
    }
  };

  return (
    <div className="doctor-dashboard">
      <nav className="doctor-nav">
        <h2>Doctor Dashboard</h2>

        <div className="tabs">
          <button
            className={activeTab === "patients" ? "active" : ""}
            onClick={() => setActiveTab("patients")}
          >
            Patients
          </button>

          <button
            className={activeTab === "appointments" ? "active" : ""}
            onClick={() => setActiveTab("appointments")}
          >
            Appointments
          </button>

          <button
            className={activeTab === "radiology" ? "active" : ""}
            onClick={() => setActiveTab("radiology")}
          >
            Radiology
          </button>

          <button
            className={activeTab === "cdss" ? "active" : ""}
            onClick={() => setActiveTab("cdss")}
          >
            CDSS
          </button>

          <button
            className={activeTab === "reports" ? "active" : ""}
            onClick={() => setActiveTab("reports")}
          >
            Reports
          </button>
        </div>
      </nav>

      <main className="doctor-content">{renderTab()}</main>
    </div>
  );
}

export default DoctorDashboard;
