import React, { useEffect, useState } from "react";
import axios from "axios";
import "./RadiologyViewer.css";

function RadiologyViewer() {
  const [scans, setScans] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/api/doctor/radiology");
      setScans(res.data);
    } catch (err) {
      setError("Failed to load radiology scans");
    }
  };

  return (
    <div className="radiology-container">
      <h2>Radiology Scans</h2>

      {error && <p className="error">{error}</p>}

      <div className="scan-grid">
        {scans.map((scan) => (
          <div key={scan.scan_id} className="scan-card">
            <img src={`http://127.0.0.1:5000/${scan.file_path}`} alt="scan" />

            <p><strong>Type:</strong> {scan.scan_type}</p>
            <p><strong>Date:</strong> {scan.upload_date}</p>

            <a className="button" href={`/doctor/annotations/${scan.scan_id}`}>
              Annotate
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RadiologyViewer;
