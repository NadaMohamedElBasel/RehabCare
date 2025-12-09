// src/pages/admin/SystemLogs.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Admin.css";

function SystemLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/admin/logs");
      setLogs(res.data);
    } catch (err) {
      console.error("Fetch logs error", err);
    }
  };

  return (
    <div className="admin-section">
      <h2>System Logs</h2>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>User</th>
            <th>Action</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l, idx) => (
            <tr key={idx}>
              <td>{l.timestamp}</td>
              <td>{l.user || "-"}</td>
              <td>{l.action}</td>
              <td>{l.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SystemLogs;
