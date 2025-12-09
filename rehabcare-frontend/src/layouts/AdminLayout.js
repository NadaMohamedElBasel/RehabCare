// src/layouts/AdminLayout.js
import React from "react";
import { Link } from "react-router-dom";
import "./AdminLayout.css";

function AdminLayout({ children }) {
  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <h2 className="sidebar-title">Admin Panel</h2>
        
        <nav className="sidebar-menu">
          <Link to="/admin/dashboard">Dashboard</Link>
          <Link to="/admin/manage-users">Manage Users</Link>
          <Link to="/admin/manage-patients">Manage Patients</Link>
          <Link to="/admin/manage-doctors">Manage Doctors</Link>
          <Link to="/admin/manage-appointments">Manage Appointments</Link>
          <Link to="/admin/manage-billing">Manage Billing</Link>
          <Link to="/admin/settings">Settings</Link>
          <Link to="/admin/logs">System Logs</Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
