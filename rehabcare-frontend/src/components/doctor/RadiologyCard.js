import React from "react";
import "./Card.css";

function RadiologyCard({ scan }) {
  return (
    <div className="card">
      <h3>Scan #{scan.scan_id}</h3>
      <p><strong>Type:</strong> {scan.type}</p>
      <p><strong>Date:</strong> {scan.date}</p>
      <button>View Scan</button>
    </div>
  );
}

export default RadiologyCard;
