import React, { useEffect, useState } from "react";
import axios from "axios";

function DoctorPatients() {
  const doctorId = localStorage.getItem("doctorId");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("Doctor ID:", doctorId);

    if (!doctorId) {
      setError("Doctor not logged in");
      setLoading(false);
      return;
    }

    axios
      .get(`/api/doctor/${doctorId}/patients`)
      .then((res) => {
        setPatients(res.data);
        setError("");
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load patients");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [doctorId]);

  return (
    <div style={{ padding: "16px" }}>
      <h2>My Patients</h2>

      {loading && <p>Loading patients...</p>}

      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && patients.length === 0 && (
        <p>No patients assigned yet.</p>
      )}

      {!loading && patients.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {patients.map((p) => (
            <li
              key={p.patient_id}
              style={{
                padding: "10px",
                marginBottom: "8px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              <strong>
                {p.first_name} {p.last_name}
              </strong>
              <div style={{ fontSize: "0.9em", color: "#555" }}>
                {p.phone || "No phone"} | {p.email || "No email"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DoctorPatients;
