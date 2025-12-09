import React from "react";
import { Link } from "react-router-dom";
import "./PatientSidebar.css";

function PatientSidebar() {
  return (
    <aside className="patient-sidebar">
      <ul>
        <li><Link to="/patient/profile">Profile</Link></li>
        <li><Link to="/patient/appointments">Appointments</Link></li>
        <li><Link to="/patient/records">Medical Records</Link></li>
        <li><Link to="/patient/prescriptions">Prescriptions</Link></li>
        <li><Link to="/patient/billing">Billing</Link></li>
      </ul>
    </aside>
  );
}

export default PatientSidebar;
