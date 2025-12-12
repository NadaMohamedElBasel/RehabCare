import React, { useState, useEffect } from "react";
import axios from "axios";
import "../Prescriptions.css"; // استخدم نفس ستايل المرضى لو موجود

function DoctorPrescriptions({ doctorId }) {
  const [allPrescriptions, setAllPrescriptions] = useState([]);
  const [formData, setFormData] = useState({
    patientId: "",
    medicationName: "",
    dosage: "",
    instructions: "",
    frequency: "",
    duration: "",
    type: "medication", // medication / exercise / therapy
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchPrescriptions();
  }, [doctorId]);

  const fetchPrescriptions = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/doctor/${doctorId}/prescriptions`);
      setAllPrescriptions(res.data);
    } catch (err) {
      setError("Failed to load prescriptions");
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/doctor/prescriptions", {
        doctorId,
        patientId: formData.patientId,
        medicationName: formData.medicationName,
        dosage: formData.dosage,
        instructions: formData.instructions,
        frequency: formData.frequency,
        duration: formData.duration,
        type: formData.type,
      });

      setSuccess("Prescription created successfully!");
      fetchPrescriptions();
      setTimeout(() => setSuccess(""), 2500);

      setFormData({
        patientId: "",
        medicationName: "",
        dosage: "",
        instructions: "",
        frequency: "",
        duration: "",
        type: "medication",
      });

    } catch (err) {
      setError("Failed to create prescription");
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/prescriptions/${id}`, {
        status: newStatus,
      });
      fetchPrescriptions();
    } catch (err) {
      setError("Failed to update status");
    }
  };

  return (
    <div className="doctor-prescriptions-container">
      <h2>Doctor Prescriptions</h2>

      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}

      {/* CREATE PRESCRIPTION */}
      <section className="create-prescription-section">
        <h3>Create New Prescription</h3>

        <form onSubmit={handleCreatePrescription} className="prescription-form">

          <div className="form-group">
            <label>Patient ID:</label>
            <input
              type="number"
              name="patientId"
              value={formData.patientId}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Prescription Type:</label>
            <select name="type" value={formData.type} onChange={handleInputChange}>
              <option value="medication">Medication</option>
              <option value="exercise">Exercise</option>
              <option value="therapy">Therapy</option>
            </select>
          </div>

          <div className="form-group">
            <label>Medication / Exercise Name:</label>
            <input
              type="text"
              name="medicationName"
              value={formData.medicationName}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Dosage:</label>
            <input
              type="text"
              name="dosage"
              value={formData.dosage}
              onChange={handleInputChange}
              placeholder="e.g. 1 tablet daily"
            />
          </div>

          <div className="form-group">
            <label>Instructions:</label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleInputChange}
              rows="2"
            ></textarea>
          </div>

          <div className="form-group">
            <label>Frequency:</label>
            <input
              type="text"
              name="frequency"
              value={formData.frequency}
              onChange={handleInputChange}
              placeholder="e.g. Twice a day"
            />
          </div>

          <div className="form-group">
            <label>Duration:</label>
            <input
              type="text"
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              placeholder="e.g. 7 days"
            />
          </div>

          <button type="submit" className="btn-primary">Create Prescription</button>
        </form>
      </section>

      {/* EXISTING PRESCRIPTIONS */}
      <section className="prescriptions-section">
        <h3>Prescriptions Written</h3>

        {allPrescriptions.length === 0 ? (
          <p>No prescriptions written yet.</p>
        ) : (
          <div className="prescriptions-list">
            {allPrescriptions.map((p) => (
              <div key={p.prescription_id} className="prescription-card">

                <h4>
                  {p.medication_name} 
                  <span className={`status-badge ${p.status}`}>{p.status}</span>
                </h4>

                <p><strong>Patient:</strong> {p.patient_id}</p>
                <p><strong>Type:</strong> {p.type}</p>
                <p><strong>Dosage:</strong> {p.dosage}</p>
                <p><strong>Instructions:</strong> {p.instructions}</p>
                <p><strong>Frequency:</strong> {p.frequency}</p>
                <p><strong>Duration:</strong> {p.duration}</p>
                <p><strong>Date:</strong> {p.issued_date}</p>

                {/* STATUS BUTTONS */}
                <div className="button-group">
                  <button
                    className="btn-edit"
                    onClick={() => updateStatus(p.prescription_id, "completed")}
                  >
                    Mark Completed
                  </button>

                  <button
                    className="btn-delete"
                    onClick={() => updateStatus(p.prescription_id, "cancelled")}
                  >
                    Cancel
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default DoctorPrescriptions;
