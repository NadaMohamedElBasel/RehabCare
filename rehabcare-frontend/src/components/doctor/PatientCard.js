import React from "react";
import "./Card.css";

function PatientCard({ patient }) {
  return (
    <div className="card">
      <h3>{patient.name}</h3>
      <p><strong>Email:</strong> {patient.email}</p>
      <p><strong>Condition:</strong> {patient.condition}</p>
      <p><strong>Last Visit:</strong> {patient.last_visit}</p>
    </div>
  );
}

export default PatientCard;
