import React, { useState } from "react";
import "./CDSSModule.css"; 

function CDSSModule({ doctorId }) {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // const handleAnalyze = async () => {
  //   setLoading(true);
  //   setResult(null);

  //   // Placeholder action — AI backend will be added later
  //   setTimeout(() => {
  //     setResult({
  //       diagnosis: "Potential Musculoskeletal Strain",
  //       riskScore: "Moderate (65%)",
  //       recommendations: [
  //         "Order X-ray if pain persists > 48 hours",
  //         "Refer to physiotherapy",
  //         "Follow up after 1 week"
  //       ]
  //     });
  //     setLoading(false);
  //   }, 1200);
  // };
  const [imageFile, setImageFile] = useState(null);

  const handleAnalyze = async () => {
    if (!imageFile) return;
    setLoading(true);
    setResult(null);

    const fd = new FormData();
    fd.append("file", imageFile);

    try {
      const res = await fetch("http://localhost:5000/api/predict", {
        method: "POST",
        body: fd
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error || "Prediction failed" });
      } else {
        setResult({
          diagnosis: data.label,
          riskScore: `Confidence ${(data.confidence * 100).toFixed(1)}%`,
          raw: data
        });
      }
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cdss-container">
      <h2>Clinical Decision Support System (CDSS)</h2>
      

      <div className="cdss-input-section">
        
        <label>Upload image :</label>
        <input type="file" accept="image/*" onChange={(e)=> setImageFile(e.target.files?.[0] || null)} />
      </div>

      <button className="cdss-btn" onClick={handleAnalyze} disabled={!imageFile && !inputText}>
        {loading ? "Analyzing..." : "Run CDSS Analysis"}
      </button>

      {/* Result Section */}
      {result && (
        <div className="cdss-result">
          <h3>AI Analysis Result</h3>

          {result.error ? (
            <p style={{ color: "red" }}><strong>Error:</strong> {result.error}</p>
          ) : (
            <>
              <p><strong>Suggested Diagnosis:</strong> {result.diagnosis || "—"}</p>
              <p><strong>Risk Score:</strong> {result.riskScore || "—"}</p>

              <h4>Recommended Actions:</h4>
             <ul>
                {(() => {
                  const recs = Array.isArray(result.recommendations)
                    ? result.recommendations
                    : Array.isArray(result.raw?.recommendations)
                      ? result.raw.recommendations
                      : [];

                  if (recs.length === 0) {
                    return <li>No specific recommendations returned by model.</li>;
                  }

                  return recs.map((r, idx) => <li key={idx}>{r}</li>);
                })()}
              </ul>
            </>
          )}
        </div> )}
    </div>
  );
}

export default CDSSModule;
