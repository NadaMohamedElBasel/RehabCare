import React from "react";
import "./Card.css";

function ReportCard({ report }) {
  return (
    <div className="card">
      <h3>{report.title}</h3>
      <p>{report.summary}</p>
      <button>Open Report</button>
    </div>
  );
}

export default ReportCard;
