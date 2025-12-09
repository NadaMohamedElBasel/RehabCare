// src/pages/admin/AdminDashboard.js
import React, { useState } from "react";
import ManageDoctors from "./ManageDoctors";
import ManagePatients from "./ManagePatients";
import ManageUsers from "./ManageUsers";
import ManageAppointments from "./ManageAppointments";
import ManageBilling from "./ManageBilling";
import Settings from "./Settings";
import SystemLogs from "./SystemLogs";
import "./Admin.css";

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("users");

  const renderContent = () => {
    switch (activeTab) {
      case "users":
        return <ManageUsers />;
      case "doctors":
        return <ManageDoctors />;
      case "patients":
        return <ManagePatients />;
      case "appointments":
        return <ManageAppointments />;
      case "billing":
        return <ManageBilling />;
      case "settings":
        return <Settings />;
      case "logs":
        return <SystemLogs />;
      default:
        return <ManageUsers />;
    }
  };

  return (
    <div className="admin-container">
      <nav className="admin-nav">
        <h2>Admin Panel</h2>

        <div className="admin-tabs">
          <button
            className={activeTab === "users" ? "active" : ""}
            onClick={() => setActiveTab("users")}
          >
            Users
          </button>
          <button
            className={activeTab === "doctors" ? "active" : ""}
            onClick={() => setActiveTab("doctors")}
          >
            Doctors
          </button>
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
            className={activeTab === "billing" ? "active" : ""}
            onClick={() => setActiveTab("billing")}
          >
            Billing
          </button>
          <button
            className={activeTab === "settings" ? "active" : ""}
            onClick={() => setActiveTab("settings")}
          >
            Settings
          </button>
          <button
            className={activeTab === "logs" ? "active" : ""}
            onClick={() => setActiveTab("logs")}
          >
            System Logs
          </button>
        </div>
      </nav>

      <main className="admin-content">{renderContent()}</main>
    </div>
  );
}

export default AdminDashboard;
