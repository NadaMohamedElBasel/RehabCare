import React from "react";
import "./Card.css";

function AppointmentCard({ appointment }) {
  return (
    <div className="card">
      <h3>Appointment #{appointment.id}</h3>
      <p><strong>Patient:</strong> {appointment.patient_name}</p>
      <p><strong>Date:</strong> {appointment.date}</p>
      <p><strong>Status:</strong> {appointment.status}</p>
    </div>
  );
}

export default AppointmentCard;
