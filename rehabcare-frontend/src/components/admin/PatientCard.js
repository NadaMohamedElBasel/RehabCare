import React from "react";
import "./Card.css";

function PatientCard({ patient }) {
  return (
    <div className="card">
      <h3>{patient.first_name} {patient.last_name}</h3>
      <p><strong>Email:</strong> {patient.email}</p>
      <p><strong>Phone:</strong> {patient.phone_number}</p>
      <p><strong>DOB:</strong> {patient.date_of_birth}</p>
    </div>
  );
}

export default PatientCard;
