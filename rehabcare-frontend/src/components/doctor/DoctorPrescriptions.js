import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import "./Doctorprescription.css";

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

  // ✅ sets as TEXT
  const [formData, setFormData] = useState({
    patientId: "",
    type: "medication",
    medicationName: "",
    dosage: "",
    sets: "", // ✅ TEXT
    instructions: "",
    frequency: "",
    startDate: "",
    endDate: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  /* ================= SPEECH TO TEXT (INSTRUCTIONS) ================= */
  const recognitionRef = useRef(null);
  const instructionsBaseRef = useRef("");
  const [sttSupported, setSttSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSttSupported(false);
      return;
    }

    setSttSupported(true);

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalChunk += transcript;
        else interimChunk += transcript;
      }

      if (finalChunk) {
        instructionsBaseRef.current = `${instructionsBaseRef.current}${finalChunk}`.replace(
          /\s+/g,
          " "
        );

        setFormData((prev) => ({
          ...prev,
          instructions: instructionsBaseRef.current.trim(),
        }));
      }

      setInterimText(interimChunk.trim());
    };

    rec.onerror = () => {
      setError("Speech recognition error. Check microphone permission.");
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
      setInterimText("");
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch {}
      recognitionRef.current = null;
    };
  }, []);

  const startDictation = () => {
    if (!sttSupported || !recognitionRef.current) {
      setError("Speech-to-text not supported. Use Chrome/Edge.");
      return;
    }
    if (isListening) return;

    setError("");
    setInterimText("");

    const base = (formData.instructions || "").trim();
    instructionsBaseRef.current = base ? base + " " : "";

    try {
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setError("Could not start dictation. Try again.");
    }
  };

  const stopDictation = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {}
  };

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    if (!doctorId) return;
    fetchPatients();
    fetchPrescriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const resetForm = () => {
    stopDictation();
    setError("");
    setSuccess("");
    setFormData({
      patientId: "",
      type: "medication",
      medicationName: "",
      dosage: "",
      sets: "",
      instructions: "",
      frequency: "",
      startDate: "",
      endDate: "",
    });
    setMedCategory("");
    setDosageForm("");
    setExerciseCategory("");
    setExerciseMode("");
    instructionsBaseRef.current = "";
    setInterimText("");
  };

  const openNewPrescription = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.patientId) return setError("Please select patient");
    if (!formData.medicationName)
      return setError("Please select medication or exercise");
    if (!formData.dosage) return setError("Dosage / reps / hold is required");

    // ✅ require sets for exercise
    if (formData.type === "exercise" && !formData.sets)
      return setError("Sets is required for exercises");

    if (new Date(formData.endDate) < new Date(formData.startDate))
      return setError("End date must be after start date");

    setLoading(true);

    try {
      await axios.post("http://localhost:5000/api/doctor/prescriptions", {
        doctorId,
        ...formData,
        sets: formData.type === "exercise" ? Number(formData.sets) : null,
        duration: calcDurationDays(),
      });

      stopDictation();
      setSuccess("✅ Prescription created successfully");
      await fetchPrescriptions();
      setIsModalOpen(false);
    } catch {
      setError("Failed to create prescription");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`http://localhost:5000/api/prescriptions/${id}`, {
        status,
      });
      fetchPrescriptions();
    } catch {
      setError("Failed to update prescription status");
    }
  };

  const filteredPrescriptions = prescriptions.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(p.patient_id || "").toLowerCase().includes(q) ||
      String(p.medication_name || "").toLowerCase().includes(q) ||
      String(p.type || "").toLowerCase().includes(q) ||
      String(p.status || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="doctor-prescriptions-container">
      {/* ===== HEADER ===== */}
      <div className="doctors-header">
        <div className="header-left">
          <h3>Doctor Prescriptions</h3>
        </div>

        <div className="header-actions">
          <div className="fb-search">
            <span className="fb-icon">
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </span>

            <input
              type="text"
              placeholder="Search prescriptions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="fb-add-btn"
            title="New Prescription"
            onClick={openNewPrescription}
          >
            +
          </button>
        </div>
      </div>

      {/* ===== TABLE ===== */}
      <section className="management-card">
        <div className="management-header">
          <h3>Prescriptions Written</h3>
        </div>

        {filteredPrescriptions.length === 0 ? (
          <p className="empty">No prescriptions found.</p>
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
                {filteredPrescriptions.map((p) => (
                  <tr key={p.prescription_id}>
                    <td>{p.issued_date || "-"}</td>
                    <td>#{p.patient_id}</td>

                    <td>
                      <span className="badge">
                        {p.type === "medication" ? "Medication" : "Exercise"}
                      </span>
                    </td>

                    <td>{p.medication_name}</td>
                    <td>
                      {p.dosage || "-"}
                      {p.type === "exercise" && p.sets
                        ? ` • ${p.sets} set(s)`
                        : ""}
                    </td>
                    <td>{p.frequency || "-"}</td>
                    <td>{p.duration || "-"}</td>

                    <td>
                      <span className={`status-pill ${p.status}`}>
                        {String(p.status || "").toUpperCase()}
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

      {/* ===== MODAL: NEW PRESCRIPTION FORM ===== */}
      {isModalOpen && (
        <div className="modal-overlay" onMouseDown={() => setIsModalOpen(false)}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Prescription</h3>
              <button
                className="modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* ===== TABS ===== */}
            <div className="prescription-tabs">
              <button
                type="button"
                className={formData.type === "medication" ? "active" : ""}
                onClick={() => {
                  stopDictation();
                  setFormData((prev) => ({
                    ...prev,
                    type: "medication",
                    medicationName: "",
                    dosage: "",
                    sets: "",
                    frequency: "",
                  }));
                  setExerciseCategory("");
                  setExerciseMode("");
                  setInterimText("");
                  instructionsBaseRef.current = (formData.instructions || "")
                    .trim()
                    ? (formData.instructions || "").trim() + " "
                    : "";
                }}
              >
                MEDICATION
              </button>

              <button
                type="button"
                className={formData.type === "exercise" ? "active" : ""}
                onClick={() => {
                  stopDictation();
                  setFormData((prev) => ({
                    ...prev,
                    type: "exercise",
                    medicationName: "",
                    dosage: "",
                    sets: "",
                    frequency: "",
                  }));
                  setMedCategory("");
                  setDosageForm("");
                  setInterimText("");
                  instructionsBaseRef.current = (formData.instructions || "")
                    .trim()
                    ? (formData.instructions || "").trim() + " "
                    : "";
                }}
              >
                EXERCISE
              </button>
            </div>

            <form onSubmit={handleCreate} className="prescription-form">
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

              {formData.type === "medication" && (
                <>
                  <label>Medication Category</label>
                  <select
                    value={medCategory}
                    onChange={(e) => {
                      setMedCategory(e.target.value);
                      setDosageForm("");
                      setFormData((prev) => ({
                        ...prev,
                        medicationName: "",
                        dosage: "",
                        sets: "",
                      }));
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
                      const selected = MEDICATION_CATEGORIES[medCategory].items.find(
                        (m) => m.name === e.target.value
                      );
                      setFormData((prev) => ({
                        ...prev,
                        medicationName: selected.name,
                      }));
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

              {formData.type === "exercise" && (
                <>
                  <label>Exercise Category</label>
                  <select
                    value={exerciseCategory}
                    onChange={(e) => {
                      setExerciseCategory(e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        medicationName: "",
                        dosage: "",
                        sets: "",
                      }));
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
                      const selected = EXERCISE_CATEGORIES[
                        exerciseCategory
                      ].items.find((x) => x.name === e.target.value);

                      setFormData((prev) => ({
                        ...prev,
                        medicationName: selected.name,
                        dosage: "",
                        sets: "",
                      }));
                      setExerciseMode(selected.mode);
                    }}
                    required
                  >
                    <option value="">Select Exercise</option>
                    {exerciseCategory &&
                      EXERCISE_CATEGORIES[exerciseCategory].items.map((ex) => (
                        <option key={ex.name}>{ex.name}</option>
                      ))}
                  </select>

                  {/* ==================== reps ==================== */}
                  {exerciseMode === "reps" && (
                    <>
                      <input
                        type="number"
                        placeholder="Repetitions"
                        value={formData.dosage.replace(" reps", "")}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            dosage: `${e.target.value} reps`,
                          }))
                        }
                        min="1"
                        required
                      />

                      {/* ✅ sets TEXT input (digits only) */}
                      <input
                        type="text"
                        name="sets"
                        placeholder="Sets (e.g., 1 or 3)"
                        value={formData.sets}
                        onChange={(e) => {
                          const onlyDigits = e.target.value.replace(/\D/g, "");
                          setFormData((prev) => ({
                            ...prev,
                            sets: onlyDigits,
                          }));
                        }}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                      />
                    </>
                  )}

                  {/* ==================== hold ==================== */}
                  {exerciseMode === "hold" && (
                    <>
                      <input
                        type="number"
                        placeholder="Hold seconds"
                        value={formData.dosage.replace(" sec", "")}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            dosage: `${e.target.value} sec`,
                          }))
                        }
                        min="1"
                        required
                      />

                      {/* ✅ sets TEXT input (digits only) */}
                      <input
                        type="text"
                        name="sets"
                        placeholder="Sets (e.g., 1 or 3)"
                        value={formData.sets}
                        onChange={(e) => {
                          const onlyDigits = e.target.value.replace(/\D/g, "");
                          setFormData((prev) => ({
                            ...prev,
                            sets: onlyDigits,
                          }));
                        }}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                      />
                    </>
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
                 <option value="once_daily">Once daily</option>
                 <option value="twice_daily">Twice daily</option>
                 <option value="three_times_daily">3 times daily</option>
                 <option value="four_times_daily">4 times daily</option>
                 <option value="every_8_hours">Every 8 hours</option>
                 <option value="every_12_hours">Every 12 hours</option>
                 <option value="every_other_day">Every other day</option>
                 <option value="weekly">Weekly</option>
                 <option value="as_needed">As needed (PRN)</option>
               </select>

              <label
                className="instructions-label"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span>Instructions</span>

                <button
                  type="button"
                  className={`btn ${
                    isListening ? "btn-secondary" : "btn-primary"
                  }`}
                  onClick={isListening ? stopDictation : startDictation}
                  disabled={!sttSupported}
                >
                  {isListening ? "Stop 🎤" : "Dictate 🎤"}
                </button>
              </label>

              <textarea
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                placeholder="You can type or dictate here..."
              />

              {isListening && (
                <small style={{ opacity: 0.8 }}>
                  Listening… {interimText ? `(${interimText})` : ""}
                </small>
              )}

              <label>Start Date</label>
              <input
                type="date"
                className="date-input"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
              />

              <label>End Date</label>
              <input
                type="date"
                className="date-input"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
              />

              <p>Duration: {calcDurationDays()}</p>

              {error && <p className="error-text">{error}</p>}
              {success && <p className="success-text">{success}</p>}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>

                <button disabled={loading} className="btn-primary" type="submit">
                  {loading ? "Saving..." : "Create Prescription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorPrescriptions;
