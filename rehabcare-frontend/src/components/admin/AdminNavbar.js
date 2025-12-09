import React from "react";
import { Link } from "react-router-dom";
import "./AdminNavbar.css";

function AdminNavbar() {
  return (
    <nav className="admin-navbar">
      <h2 className="logo">Admin Panel</h2>

      <div className="admin-nav-links">
        <Link to="/admin/dashboard">Dashboard</Link>
        <Link to="/admin/users">Users</Link>
        <Link to="/admin/doctors">Doctors</Link>
        <Link to="/admin/patients">Patients</Link>
        <Link to="/admin/appointments">Appointments</Link>
        <Link to="/admin/billing">Billing</Link>
        <Link to="/admin/settings">Settings</Link>
      </div>
    </nav>
  );
}

export default AdminNavbar;
