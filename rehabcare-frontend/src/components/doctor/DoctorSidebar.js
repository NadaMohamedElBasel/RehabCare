import React from "react";
import { Link } from "react-router-dom";
import "./DoctorSidebar.css";

function DoctorSidebar() {
  return (
    <div className="doctor-sidebar">
      <ul>
        <li><Link to="/doctor/dashboard">📊 Dashboard</Link></li>
        <li><Link to="/doctor/patients">🧑‍🤝‍🧑 Patient List</Link></li>
        <li><Link to="/doctor/appointments">📅 Appointments</Link></li>
        <li><Link to="/doctor/radiology">🩻 Radiology Viewer</Link></li>
        <li><Link to="/doctor/cdss">🤖 CDSS Results</Link></li>
      </ul>
    </div>
  );
}

export default DoctorSidebar;
