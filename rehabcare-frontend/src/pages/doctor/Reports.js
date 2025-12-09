// src/pages/doctor/Reports.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Reports.css";

function Reports() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/doctor/reports");
      setReports(res.data);
    } catch (err) {
      setError("Failed to load reports");
    }
  };

  const downloadReport = async (id, filename) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/doctor/reports/${id}`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      alert("Download failed");
    }
  };

  return (
    <div className="reports-container">
      <h2>Patient Reports</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {reports.map((rep) => (
        <div className="report-card" key={rep.id}>
          <div className="report-header">
            <h3>{rep.title}</h3>
            <span className="report-date">{rep.date}</span>
          </div>

          <div className="report-content">
            <p>{rep.summary}</p>
          </div>

          <button
            className="download-report-btn"
            onClick={() => downloadReport(rep.id, rep.file_name)}
          >
            Download Report
          </button>
        </div>
      ))}
    </div>
  );
}

export default Reports;
