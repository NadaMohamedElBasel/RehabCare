import React from "react";
import { Link } from "react-router-dom";
import "./PatientNavbar.css";

function PatientNavbar() {
  return (
    <nav className="patient-navbar">
      <div className="logo">RehabCare</div>

      <div className="patient-nav-links">
        <Link to="/patient/profile">Profile</Link>
        <Link to="/patient/appointments">Appointments</Link>
        <Link to="/patient/records">Records</Link>
        <Link to="/patient/prescriptions">Prescriptions</Link>
        <Link to="/patient/billing">Billing</Link>
      </div>
    </nav>
  );
}

export default PatientNavbar;
