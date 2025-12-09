import React from "react";
import { Link } from "react-router-dom";
import "./DoctorNavbar.css";

function DoctorNavbar() {
  return (
    <nav className="doctor-navbar">
      <h2 className="logo">Doctor Panel</h2>

      <div className="doctor-nav-links">
        <Link to="/doctor/dashboard">Dashboard</Link>
        <Link to="/doctor/patients">Patients</Link>
        <Link to="/doctor/appointments">Appointments</Link>
        <Link to="/doctor/radiology">Radiology</Link>
        <Link to="/doctor/cdss">CDSS</Link>
      </div>
    </nav>
  );
}

export default DoctorNavbar;
