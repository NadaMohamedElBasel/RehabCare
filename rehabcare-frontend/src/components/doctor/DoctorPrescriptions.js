import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "../Prescriptions.css";

/* ================= MEDICATION CATEGORIES ================= */
const MEDICATION_CATEGORIES = {
    pain: {
    label: "Pain Relief",
    items: [
      { name: "Paracetamol", form: "tablet" },
      { name: "Ibuprofen", form: "tablet" },
      { name: "Diclofenac", form: "injection" },
      { name: "Naproxen", form: "tablet" },
    ],
  },
  muscle: {
    label: "Muscle Relaxants",
    items: [
      { name: "Baclofen", form: "tablet" },
      { name: "Tizanidine", form: "tablet" },
      { name: "Methocarbamol", form: "tablet" },
      { name: "Myolgin", form: "tablet" },
    ],
  },
  nerve: {
    label: "Nerve Medications",
    items: [
      { name: "Gabapentin", form: "tablet" },
      { name: "Pregabalin", form: "tablet" },
    ],
  },
  topical: {
    label: "Topical",
    items: [
      { name: "Diclofenac Gel", form: "topical" },
      { name: "Ketoprofen Gel", form: "topical" },
      { name: "Lidocaine Cream", form: "topical" },
      { name: "Capsaicin Cream", form: "topical" },
    ],
  },
  supplements: {
    label: "Supplements",
    items: [
      { name: "Vitamin B12", form: "tablet" },
      { name: "Neurobion", form: "tablet" },
      { name: "Calcium + Vitamin D", form: "tablet" },
      { name: "Magnesium", form: "tablet" },
    ],
  },
};

/* ================= EXERCISE CATEGORIES ================= */
const EXERCISE_CATEGORIES = {
  knee: {
    label: "Knee Rehabilitation",
    items: [
      { name: "Quadriceps Stretch", mode: "hold" },
      { name: "Hamstring Stretch", mode: "hold" },
      { name: "Straight Leg Raise", mode: "reps" },
      { name: "Heel Slides", mode: "reps" },
    ],
  },
  shoulder: {
    label: "Shoulder Rehabilitation",
    items: [
      { name: "Pendulum Exercise", mode: "hold" },
      { name: "Shoulder Flexion", mode: "reps" },
      { name: "Wall Climbing", mode: "hold" },
      { name: "External Rotation", mode: "reps" },
    ],
  },
  back: {
    label: "Back Rehabilitation",
    items: [
      { name: "Cat Camel Stretch", mode: "reps" },
      { name: "Pelvic Tilt", mode: "reps" },
      { name: "Bridging Exercise", mode: "hold" },
      { name: "Knee to Chest", mode: "hold" },
    ],
  },
  stroke: {
    label: "Stroke Rehabilitation",
    items: [
      { name: "Hand Grip Exercise", mode: "reps" },
      { name: "Finger Extension", mode: "reps" },
      { name: "Seated Balance Training", mode: "hold" },
      { name: "Standing Weight Shift", mode: "hold" },
    ],
  },
};

function DoctorPrescriptions({ doctorId }) {
  const [patients, setPatients] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [medCategory, setMedCategory] = useState("");
  const [dosageForm, setDosageForm] = useState("");
  const [exerciseCategory, setExerciseCategory] = useState("");
  const [exerciseMode, setExerciseMode] = useState("");

  const [formData, setFormData] = useState({
    patientId: "",
    type: "medication",
    medicationName: "",
    dosage: "",
    instructions: "",
    frequency: "",
    startDate: "",
    endDate: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    fetchPatients();
    fetchPrescriptions();
  }, [doctorId]);

  const fetchPatients = useCallback(async () => {
    const res = await axios.get(
      `http://localhost:5000/api/doctor/${doctorId}/patients`
    );
    setPatients(res.data);
  }, [doctorId]);

  const fetchPrescriptions = useCallback(async () => {
    const res = await axios.get(
      `http://localhost:5000/api/doctor/${doctorId}/prescriptions`
    );
    setPrescriptions(res.data);
  }, [doctorId]);

  const calcDurationDays = () => {
      const diff =
      (new Date(formData.endDate) - new Date(formData.startDate)) /
      (1000 * 60 * 60 * 24);
    return diff >= 0 ? `${diff + 1} days` : "";
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
  e.preventDefault();
  setError("");

  if (!formData.patientId) {
    setError("Please select patient");
    return;
  }

  if (!formData.medicationName) {
    setError("Please select medication or exercise");
    return;
  }

  if (!formData.dosage) {
    setError("Dosage / reps / hold is required");
    return;
  }

  if (new Date(formData.endDate) < new Date(formData.startDate)) {
    setError("End date must be after start date");
    return;
  }

  setLoading(true);

    try {
      await axios.post("http://localhost:5000/api/doctor/prescriptions", {
        doctorId,
        ...formData,
        duration: calcDurationDays(),
      });

      setSuccess("✅ Prescription created successfully");
      fetchPrescriptions();

      setFormData({
        patientId: "",
        type: formData.type,
        medicationName: "",
        dosage: "",
        instructions: "",
        frequency: "",
        startDate: "",
        endDate: "",
      });

      setMedCategory("");
      setDosageForm("");
      setExerciseCategory("");
      setExerciseMode("");
    } catch {
      setError("Failed to create prescription");
    } finally {
      setLoading(false);
    }
  };


  const updateStatus = async (id, status) => {
  try {
    await axios.put(
      `http://localhost:5000/api/prescriptions/${id}`,
      { status }
    );
    fetchPrescriptions();
  } catch {
    setError("Failed to update prescription status");
  }
};


  return (
    <div className="doctor-prescriptions-container">
      <h2>Doctor Prescriptions</h2>

      {/* ===== TABS ===== */}
      <div className="prescription-tabs">
        <button
          type="button"
          className={formData.type === "medication" ? "active" : ""}
          onClick={() => {
            setFormData({
              ...formData,
              type: "medication",
              medicationName: "",
              dosage: "",
              frequency: "",
            });
            setExerciseCategory("");
            setExerciseMode("");
          }}
        >
          MEDICATION
        </button>

        <button
          type="button"
          className={formData.type === "exercise" ? "active" : ""}
          onClick={() => {
            setFormData({
              ...formData,
              type: "exercise",
              medicationName: "",
              dosage: "",
              frequency: "",
            });
            setMedCategory("");
            setDosageForm("");
          }}
        >
          EXERCISE
        </button>
      </div>

      <form onSubmit={handleCreate} className="prescription-form">
        {/* PATIENT */}
        <label>Patient</label>
        <select
          name="patientId"
          value={formData.patientId}
          onChange={handleChange}
          required
        >
          <option value="">Select Patient</option>
          {patients.map((p) => (
            <option key={p.patient_id} value={p.patient_id}>
              {p.first_name} {p.last_name}
            </option>
          ))}
        </select>

        {/* ================= MEDICATION ================= */}
        {formData.type === "medication" && (
          <>
            <label>Medication Category</label>
            <select
              value={medCategory}
              onChange={(e) => {
                setMedCategory(e.target.value);
                setDosageForm("");
                setFormData({ ...formData, medicationName: "", dosage: "" });
              }}
              required
            >
              <option value="">Select Category</option>
              {Object.entries(MEDICATION_CATEGORIES).map(([k, c]) => (
                <option key={k} value={k}>
                  {c.label}
                </option>
              ))}
            </select>

            <label>Medication</label>
            <select
              value={formData.medicationName}
              disabled={!medCategory}
              onChange={(e) => {
                const selected =
                  MEDICATION_CATEGORIES[medCategory].items.find(
                    (m) => m.name === e.target.value
                  );
                setFormData({
                  ...formData,
                  medicationName: selected.name,
                });
                setDosageForm(selected.form);
              }}
              required
            >
              <option value="">Select Medication</option>
              {medCategory &&
                MEDICATION_CATEGORIES[medCategory].items.map((m) => (
                  <option key={m.name}>{m.name}</option>
                ))}
            </select>

            {dosageForm === "tablet" && (
              <select
                name="dosage"
                value={formData.dosage}
                onChange={handleChange}
                required
              >
                <option value="">Select Dosage</option>
                <option value="1 tablet">1 Tablet</option>
                <option value="2 tablets">2 Tablets</option>
              </select>
            )}
          </>
        )}

        {/* ================= EXERCISE ================= */}
        {formData.type === "exercise" && (
          <>
            <label>Exercise Category</label>
            <select
              value={exerciseCategory}
              onChange={(e) => {
                setExerciseCategory(e.target.value);
                setFormData({ ...formData, medicationName: "", dosage: "" });
              }}
              required
            >
              <option value="">Select Category</option>
              {Object.entries(EXERCISE_CATEGORIES).map(([k, c]) => (
                <option key={k} value={k}>
                  {c.label}
                </option>
              ))}
            </select>

            <label>Exercise</label>
            <select
              value={formData.medicationName}
              disabled={!exerciseCategory}
              onChange={(e) => {
                const selected =
                  EXERCISE_CATEGORIES[exerciseCategory].items.find(
                    (x) => x.name === e.target.value
                  );
                setFormData({ ...formData, medicationName: selected.name });
                setExerciseMode(selected.mode);
              }}
              required
            >
              <option value="">Select Exercise</option>
              {exerciseCategory &&
                EXERCISE_CATEGORIES[exerciseCategory].items.map((e) => (
                  <option key={e.name}>{e.name}</option>
                ))}
            </select>

            {exerciseMode === "reps" && (
              <input
                type="number"
                placeholder="Repetitions"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dosage: `${e.target.value} reps`,
                  })
                }
                required
              />
            )}

            {exerciseMode === "hold" && (
              <input
                type="number"
                placeholder="Hold seconds"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dosage: `${e.target.value} sec`,
                  })
                }
                required
              />
            )}
          </>
        )}
        <label>Frequency</label>
        <select
          name="frequency"
          value={formData.frequency}
          onChange={handleChange}
          required
        >
          <option value="">Select Frequency</option>
          <option value="daily">Daily</option>
          <option value="3x_week">3 times / week</option>
          <option value="alternate_days">Alternate days</option>
        </select>


        <label>Instructions</label>
        <textarea
          name="instructions"
          value={formData.instructions}
          onChange={handleChange}
        />

        <label>Start Date</label>
        <input
          type="date"
          name="startDate"
          value={formData.startDate}
          onChange={handleChange}
          required
        />

        <label>End Date</label>
        <input
          type="date"
          name="endDate"
          value={formData.endDate}
          onChange={handleChange}
          required
        />

        <p>Duration: {calcDurationDays()}</p>



        <button disabled={loading} className="btn-primary">
          {loading ? "Saving..." : "Create Prescription"}
        </button>
      </form>
{/* ===== PRESCRIPTIONS TABLE ===== */}
<section className="management-card">
  <div className="management-header">
    <h3>Prescriptions Written</h3>
  </div>

  {prescriptions.length === 0 ? (
    <p className="empty">No prescriptions written.</p>
  ) : (
    <div className="table-wrapper">
      <table className="doctors-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Patient</th>
            <th>Type</th>
            <th>Name</th>
            <th>Dosage</th>
            <th>Frequency</th>
            <th>Duration</th>
            <th>Status</th>
            <th style={{ textAlign: "center" }}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {prescriptions.map((p) => (
            <tr key={p.prescription_id}>
              <td>{p.issued_date || "-"}</td>
              <td>#{p.patient_id}</td>

              <td>
                <span className="badge">
                  {p.type === "medication" ? "Medication" : "Exercise"}
                </span>
              </td>

              <td>{p.medication_name}</td>
              <td>{p.dosage || "-"}</td>
              <td>{p.frequency || "-"}</td>
              <td>{p.duration || "-"}</td>

              <td>
                <span className={`status-pill ${p.status}`}>
                  {p.status.toUpperCase()}
                </span>
              </td>

              <td>
                <div className="actions">
                  <button
                    className="edit-btn"
                    disabled={p.status !== "active"}
                    onClick={() =>
                      updateStatus(p.prescription_id, "completed")
                    }
                  >
                    Complete
                  </button>

                  <button
                    className="delete-btn"
                    disabled={p.status !== "active"}
                    onClick={() =>
                      updateStatus(p.prescription_id, "cancelled")
                    }
                  >
                    Cancel
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</section>

    </div>
  );
}

export default DoctorPrescriptions;
