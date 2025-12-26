import React from "react";
import { useParams } from "react-router-dom";
import "./AdminLayout.css";

function AdminAppointments() {
  const { adminId } = useParams();

  return (
    <div className="dashboard-container">
      <h2>Admin Appointments</h2>

      <div className="dashboard-content">
        <div className="stat-card">
          📅 <strong>Admin Appointments page is working</strong>
          <p>Admin ID: {adminId}</p>
        </div>
      </div>
    </div>
  );
}

export default AdminAppointments;
