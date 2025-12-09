// src/pages/doctor/CDSSResult.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./CDSSResult.css";

function CDSSResult() {
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCDSSResults();
  }, []);

  const fetchCDSSResults = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/doctor/cdss-results");
      setResults(res.data);
    } catch (err) {
      setError("Failed to load AI analysis results");
    }
  };

  const riskColor = (level) => {
    if (!level) return "risk-low";
    switch (level.toLowerCase()) {
      case "high": return "risk-high";
      case "medium": return "risk-medium";
      default: return "risk-low";
    }
  };

  return (
    <div className="cdss-container">
      <h2>AI Clinical Decision Support System</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {results.map((item) => (
        <div className="cdss-card" key={item.id}>
          <div className="cdss-header">
            <h3>{item.finding_name}</h3>
            <span className="cdss-score">Score: {item.confidence}%</span>
          </div>

          <div className="cdss-result-section">
            <h4>Risk Level</h4>
            <span className={`risk-badge ${riskColor(item.risk_level)}`}>
              {item.risk_level}
            </span>
          </div>

          <div className="cdss-result-section">
            <h4>Description</h4>
            <p>{item.description}</p>
          </div>

          <div className="cdss-result-section">
            <h4>Recommendations</h4>
            <p>{item.recommendation}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default CDSSResult;
