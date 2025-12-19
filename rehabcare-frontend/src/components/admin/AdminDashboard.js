import React, { useState } from "react";
import "./AdminLayout.css";

import AdminStats from "./AdminStats";
import AdminDoctors from "./AdminDoctors";
import AdminAppointment from "./AdminAppointment";

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>Admin Dashboard</h2>

        <div className="tabs">
          <button
            className={activeTab === "dashboard" ? "active" : ""}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>

          <button
            className={activeTab === "doctors" ? "active" : ""}
            onClick={() => setActiveTab("doctors")}
          >
            Doctors
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
        </div>
      </nav>

      <main className="dashboard-content">
        <div className="dashboard-frame">
          {activeTab === "dashboard" && <AdminStats />}
          {activeTab === "doctors" && <AdminDoctors />}
          {activeTab === "appointments" && <AdminAppointment />}

          {activeTab === "billing" && (
            <div className="page">
              <h3>💳 Billing Management</h3>
              <p className="subtitle">Manage invoices and payments</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
