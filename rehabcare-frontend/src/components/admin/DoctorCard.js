import React from "react";
import "./Card.css";

function DoctorCard({ doctor }) {
  return (
    <div className="card">
      <h3>{doctor.first_name} {doctor.last_name}</h3>
      <p><strong>Email:</strong> {doctor.email}</p>
      <p><strong>Specialization:</strong> {doctor.specialization}</p>
      <p><strong>Phone:</strong> {doctor.phone}</p>
    </div>
  );
}

export default DoctorCard;
