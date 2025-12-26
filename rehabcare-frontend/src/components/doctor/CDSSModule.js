import React, { useState } from "react";
import "./CDSSModule.css"; 

function CDSSModule({ doctorId }) {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);

    // Placeholder action — AI backend will be added later
    setTimeout(() => {
      setResult({
        diagnosis: "Potential Musculoskeletal Strain",
        riskScore: "Moderate (65%)",
        recommendations: [
          "Order X-ray if pain persists > 48 hours",
          "Refer to physiotherapy",
          "Follow up after 1 week"
        ]
      });
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="cdss-container">
      <h2>Clinical Decision Support System (CDSS)</h2>
      <p className="cdss-subtitle">
        Enter symptoms or clinical notes to generate AI-powered suggestions.
      </p>

      <div className="cdss-input-section">
        <label>Patient Symptoms / Notes:</label>
        <textarea
          placeholder="Example: Patient reports lower back pain radiating to left leg..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows="5"
        />
      </div>

      <button className="cdss-btn" onClick={handleAnalyze} disabled={!inputText}>
        {loading ? "Analyzing..." : "Run CDSS Analysis"}
      </button>

      {/* Result Section */}
      {result && (
        <div className="cdss-result">
          <h3>AI Analysis Result</h3>

          <p><strong>Suggested Diagnosis:</strong> {result.diagnosis}</p>
          <p><strong>Risk Score:</strong> {result.riskScore}</p>

          <h4>Recommended Actions:</h4>
          <ul>
            {result.recommendations.map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default CDSSModule;
