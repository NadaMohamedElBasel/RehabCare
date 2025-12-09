import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import "./MedicalRecords.css";

function MedicalRecords() {
  const { patientId } = useParams();

  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRecords();
  }, [patientId]);

  const fetchRecords = async () => {
    try {
      const response = await axios.get(
        `http://127.0.0.1:5000/api/medical-records/${patientId}`
      );
      setRecords(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch records");
    }
  };

  const downloadFile = async (fileId, fileName) => {
    try {
      const response = await axios.get(
        `http://127.0.0.1:5000/api/medical-records/files/${fileId}`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError("Failed to download file");
    }
  };

  return (
    <div className="medical-records-container">
      <h2>Medical Records</h2>

      {error && <p className="error-message">{error}</p>}

      <div className="records-timeline">
        {records.length === 0 ? (
          <p className="no-records">No medical records available.</p>
        ) : (
          records.map((record) => (
            <div key={record.record_id} className="record-card">
              {/* Header */}
              <div className="record-header">
                <h4>{record.record_type}</h4>
                <span className="record-date">
                  {record.visit_date
                    ? new Date(record.visit_date).toLocaleDateString()
                    : "Date not specified"}
                </span>
              </div>

              {/* Diagnosis / Department */}
              {record.department && (
                <span className="diagnosis-badge">{record.department}</span>
              )}

              {/* Body */}
              <div className="record-details">
                <p>{record.record_data}</p>
              </div>

              {/* File download IF EXISTS */}
              {record.file_name && (
                <button
                  className="download-button"
                  onClick={() =>
                    downloadFile(record.file_id, record.file_name)
                  }
                >
                  Download Attachment
                </button>
              )}

              {/* Footer */}
              <div className="record-footer">
                <small>
                  Created on:{" "}
                  {record.created_at
                    ? new Date(record.created_at).toLocaleString()
                    : "Unknown"}
                </small>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MedicalRecords;
