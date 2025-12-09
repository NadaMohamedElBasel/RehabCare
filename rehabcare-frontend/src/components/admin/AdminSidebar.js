import React from "react";
import { Link } from "react-router-dom";
import "./AdminSidebar.css";

function AdminSidebar() {
  return (
    <div className="admin-sidebar">
      <ul>
        <li><Link to="/admin/dashboard">📊 Dashboard</Link></li>
        <li><Link to="/admin/users">👥 Manage Users</Link></li>
        <li><Link to="/admin/doctors">🩺 Doctors</Link></li>
        <li><Link to="/admin/patients">🏥 Patients</Link></li>
        <li><Link to="/admin/appointments">📅 Appointments</Link></li>
        <li><Link to="/admin/billing">💳 Billing</Link></li>
        <li><Link to="/admin/settings">⚙ Settings</Link></li>
        <li><Link to="/admin/logs">📝 System Logs</Link></li>
      </ul>
    </div>
  );
}

export default AdminSidebar;
