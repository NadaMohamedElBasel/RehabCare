import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./DoctorMedicalRecords.css";

const API = "http://localhost:5000";

/* ================= ICD-10 DIAGNOSES ================= */
const ICD10_DIAGNOSES = {
  orthopedic: [
    { code: "M54.50", label: "Low back pain, unspecified" },
    { code: "M17.9", label: "Osteoarthritis of knee, unspecified" },
    { code: "M75.40", label: "Impingement syndrome of shoulder, unspecified" },
    { code: "M75.10", label: "Rotator cuff tear/rupture, unspecified shoulder" },
    { code: "S83.209A", label: "Tear of meniscus, current injury, unspecified knee (initial)" },
  ],
  neurological: [
    { code: "I69.30", label: "Sequelae of cerebral infarction (post-stroke)" },
    { code: "G82.20", label: "Paraplegia, unspecified" },
    { code: "G81.90", label: "Hemiplegia, unspecified" },
    { code: "G20", label: "Parkinson’s disease" },
  ],
  sports: [
    { code: "S83.519A", label: "Sprain of ACL, unspecified knee (initial)" },
    { code: "T14.8XXA", label: "Other injury of unspecified body region (initial)" },
    { code: "S93.409A", label: "Sprain of unspecified ligament of unspecified ankle (initial)" },
    { code: "M77.10", label: "Lateral epicondylitis (tennis elbow), unspecified elbow" },
  ],
  post_surgical: [
    { code: "Z96.659", label: "Presence of artificial knee joint, unspecified" },
    { code: "Z96.649", label: "Presence of artificial hip joint, unspecified" },
    { code: "Z98.890", label: "Other specified postprocedural states" },
  ],
  functional: [
    { code: "R26.9", label: "Unspecified abnormalities of gait and mobility" },
    { code: "R26.81", label: "Unsteadiness on feet" },
    { code: "G89.4", label: "Chronic pain syndrome" },
  ],
};

function DoctorMedicalRecords({ doctorId }) {
  /* ================= STATE ================= */
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [error, setError] = useState("");

  const [expandedPatientId, setExpandedPatientId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [recordsByPatientId, setRecordsByPatientId] = useState({});
  const [loadingRecordsByPatientId, setLoadingRecordsByPatientId] = useState({});

  const [panelMode, setPanelMode] = useState(null); // "add" | "edit" | null
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [formData, setFormData] = useState({
    category: "",
    recordType: "", // ICD-10 "CODE - Label"
    recordData: "", // notes (plain)
    gender: "",
    weight: "",
    height: "",
    bpSystolic: "",
    bpDiastolic: "",
  });

  /* ================= SPEECH TO TEXT (NOTES) ================= */
  const recognitionRef = useRef(null);
  const notesBaseRef = useRef("");
  const [sttSupported, setSttSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");

  const stopNotesDictation = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {}
  };

  const startNotesDictation = () => {
    if (!sttSupported || !recognitionRef.current) {
      setError("Speech-to-text not supported. Use Chrome/Edge.");
      return;
    }
    if (isListening) return;

    setError("");
    setInterimText("");

    const base = (formData.recordData || "").trim();
    notesBaseRef.current = base ? base + " " : "";

    try {
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setError("Could not start dictation. Try again.");
    }
  };

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
        notesBaseRef.current = `${notesBaseRef.current}${finalChunk}`.replace(
          /\s+/g,
          " "
        );

        setFormData((prev) => ({
          ...prev,
          recordData: notesBaseRef.current.trim(),
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

  /* ================= HELPERS ================= */
  const parseRecordData = (data) => {
    if (!data || typeof data !== "string") return {};
    try {
      const parsed = JSON.parse(data);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  };

  const resetForm = () => {
    stopNotesDictation();
    notesBaseRef.current = "";
    setInterimText("");
    setIsListening(false);

    setFormData({
      category: "",
      recordType: "",
      recordData: "",
      gender: "",
      weight: "",
      height: "",
      bpSystolic: "",
      bpDiastolic: "",
    });

    setSelectedRecord(null);
    setPanelMode(null);
    setError("");
  };

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.first_name?.toLowerCase().includes(q) ||
        p.last_name?.toLowerCase().includes(q)
    );
  }, [search, patients]);

  /* ================= LOAD PATIENTS ================= */
  useEffect(() => {
    if (!doctorId) return;

    const fetchPatients = async () => {
      setLoadingPatients(true);
      setError("");
      try {
        const res = await axios.get(`${API}/api/doctor/${doctorId}/patients`);
        setPatients(res.data || []);
      } catch {
        setError("Failed to load patients");
      } finally {
        setLoadingPatients(false);
      }
    };

    fetchPatients();
  }, [doctorId]);

  /* ================= LOAD RECORDS (CACHED) ================= */
  const fetchRecordsForPatient = async (patientId) => {
    if (!doctorId || !patientId) return;
    if (loadingRecordsByPatientId[patientId]) return;

    setLoadingRecordsByPatientId((prev) => ({ ...prev, [patientId]: true }));
    setError("");

    try {
      const res = await axios.get(
        `${API}/api/doctor/${doctorId}/patients/${patientId}/medical-records`
      );

      setRecordsByPatientId((prev) => ({
        ...prev,
        [patientId]: res.data || [],
      }));
    } catch {
      setError("Failed to load medical records");
      setRecordsByPatientId((prev) => ({ ...prev, [patientId]: [] }));
    } finally {
      setLoadingRecordsByPatientId((prev) => ({ ...prev, [patientId]: false }));
    }
  };

  /* ================= PATIENT CLICK (TOGGLE OPEN/CLOSE) ================= */
  const handlePatientClick = async (patient) => {
    const id = patient.patient_id;

    if (expandedPatientId === id) {
      setExpandedPatientId(null);
      setSelectedPatient(null);
      resetForm();
      return;
    }

    setExpandedPatientId(id);
    setSelectedPatient(patient);
    resetForm();

    if (!recordsByPatientId[id]) {
      await fetchRecordsForPatient(id);
    }
  };

  /* ================= FORM ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (["weight", "height", "bpSystolic", "bpDiastolic"].includes(name)) {
      if (value !== "" && isNaN(value)) return;
    }

    if (name === "category") {
      setFormData((prev) => ({
        ...prev,
        category: value,
        recordType: "", // reset ICD-10 diagnosis when category changes
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "recordData") {
      const base = value.trim();
      notesBaseRef.current = base ? base + " " : "";
    }
  };

  const saveRecord = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedPatient) {
      setError("Select a patient first");
      return;
    }

    if (!formData.recordType) {
      setError("ICD-10 diagnosis is required");
      return;
    }

    const vitals = {};
    if (formData.gender) vitals.gender = formData.gender;
    if (formData.weight) vitals.weight = Number(formData.weight);
    if (formData.height) vitals.height = Number(formData.height);

    if (formData.bpSystolic && formData.bpDiastolic) {
      vitals.bloodPressure = `${formData.bpSystolic}/${formData.bpDiastolic}`;
    }

    if (formData.recordData?.trim()) {
      vitals.notes = formData.recordData.trim();
    }

    const payload = {
      recordType: formData.recordType, // "CODE - Label"
      department: formData.category,
      recordData: JSON.stringify(vitals),
    };

    try {
      if (panelMode === "add") {
        await axios.post(
          `${API}/api/doctor/${doctorId}/patients/${selectedPatient.patient_id}/medical-records`,
          payload
        );
      } else if (panelMode === "edit" && selectedRecord) {
        await axios.put(
          `${API}/api/doctor/${doctorId}/medical-records/${selectedRecord.record_id}`,
          payload
        );
      }

      await fetchRecordsForPatient(selectedPatient.patient_id);
      resetForm();
    } catch {
      setError("Failed to save medical record");
    }
  };

  /* ================= INLINE RECORDS (UNDER PATIENT) ================= */
  const openEditFromRecord = (record) => {
    const data = parseRecordData(record.record_data);

    setSelectedRecord(record);
    setPanelMode("edit");
    setFormData({
      category: record.department || "",
      recordType: record.record_type || "", // keep existing stored ICD-10 value
      recordData: data.notes || "",
      gender: data.gender || "",
      weight: data.weight ?? "",
      height: data.height ?? "",
      bpSystolic: data.bloodPressure?.split("/")[0] || "",
      bpDiastolic: data.bloodPressure?.split("/")[1] || "",
    });

    const currentNotes = (data.notes || "").trim();
    notesBaseRef.current = currentNotes ? currentNotes + " " : "";
    setInterimText("");
    setIsListening(false);
  };

  /* ================= UI ================= */
  return (
    <div className="medical-layout">
      {/* ========== LEFT PANEL: PATIENTS ========== */}
      <aside className="patients-panel">
        <h4>Patients</h4>

        <input
          className="search-input"
          placeholder="Search patients"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loadingPatients ? (
          <p>Loading...</p>
        ) : (
          <ul className="patients-list">
            {filteredPatients.map((p) => {
              const isExpanded = expandedPatientId === p.patient_id;
              const miniRecords = recordsByPatientId[p.patient_id] || [];
              const miniLoading = !!loadingRecordsByPatientId[p.patient_id];

              return (
                <li
                  key={p.patient_id}
                  className={isExpanded ? "active" : ""}
                  onClick={() => handlePatientClick(p)}
                >
                  <div className="patient-row">
                    <span className="patient-name">
                      {p.first_name} {p.last_name}
                    </span>
                    <span className="patient-id"> - ID {p.patient_id}</span>
                  </div>

                  {isExpanded && (
                    <div
                      className="patient-records-inline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-header">
                        <span className="inline-title">Medical Records</span>

                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            resetForm();
                            setSelectedPatient(p);
                            setPanelMode("add");
                          }}
                        >
                          + Add
                        </button>
                      </div>

                      {miniLoading ? (
                        <p className="inline-loading">Loading records...</p>
                      ) : miniRecords.length === 0 ? (
                        <p className="inline-empty">No records.</p>
                      ) : (
                        <div className="inline-table-wrapper">
                          <table className="inline-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Diagnosis (ICD-10)</th>
                                <th>Gender</th>
                                <th>Weight</th>
                                <th>Height</th>
                                <th>BP</th>
                                <th>Notes</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {miniRecords.map((r) => {
                                const data = parseRecordData(r.record_data);
                                return (
                                  <tr key={r.record_id}>
                                    <td>
                                      {r.created_at
                                        ? new Date(r.created_at).toLocaleDateString()
                                        : "-"}
                                    </td>
                                    <td>{r.record_type || "-"}</td>
                                    <td>{data.gender || "-"}</td>
                                    <td>{data.weight ?? "-"}</td>
                                    <td>{data.height ?? "-"}</td>
                                    <td>{data.bloodPressure || "-"}</td>
                                    <td className="notes-cell">{data.notes || "-"}</td>
                                    <td>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => {
                                          setSelectedPatient(p);
                                          openEditFromRecord(r);
                                        }}
                                      >
                                        Edit
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {error && <p className="error-msg">{error}</p>}
      </aside>

      {/* ========== ADD / EDIT MODAL ========== */}
      {panelMode && (
        <div className="top-panel" onMouseDown={resetForm}>
          <div
            className="medical-modal-card"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="panel-header">
              <h4>{panelMode === "add" ? "Add Medical Record" : "Edit Medical Record"}</h4>

              <button type="button" className="close-btn" onClick={resetForm}>
                ✕
              </button>
            </div>

            <form onSubmit={saveRecord} className="record-card">
              {/* ===== GENDER ===== */}
              <div className="form-row">
                <label>Gender</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={formData.gender === "male"}
                      onChange={handleChange}
                    />
                    Male
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={formData.gender === "female"}
                      onChange={handleChange}
                    />
                    Female
                  </label>
                </div>
              </div>

              {/* ===== VITAL SIGNS ===== */}
              <div className="form-grid">
                <div>
                  <label>Blood Pressure</label>
                  <div className="bp-inputs">
                    <input
                      type="number"
                      name="bpSystolic"
                      placeholder="120"
                      value={formData.bpSystolic}
                      onChange={handleChange}
                    />
                    <span>/</span>
                    <input
                      type="number"
                      name="bpDiastolic"
                      placeholder="80"
                      value={formData.bpDiastolic}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    placeholder="70"
                    value={formData.weight}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label>Height (cm)</label>
                  <input
                    type="number"
                    name="height"
                    placeholder="170"
                    value={formData.height}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* ===== SELECTS ===== */}
              <div className="form-row">
                <label>Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Category</option>
                  <option value="orthopedic">Orthopedic</option>
                  <option value="neurological">Neurological</option>
                  <option value="sports">Sports Injury</option>
                  <option value="post_surgical">Post-Surgical Rehab</option>
                  <option value="functional">Functional / Chronic</option>
                </select>
              </div>

              <div className="form-row">
                <label>ICD-10 Diagnosis</label>
                <select
                  name="recordType"
                  value={formData.recordType}
                  onChange={handleChange}
                  required
                  disabled={!formData.category}
                >
                  <option value="">
                    {formData.category ? "Select ICD-10 Diagnosis" : "Select Category First"}
                  </option>

                  {(ICD10_DIAGNOSES[formData.category] || []).map((d) => (
                    <option key={d.code} value={`${d.code} - ${d.label}`}>
                      {d.code} - {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* ===== NOTES + Dictation ===== */}
              <div className="form-row">
                <label className="notes-label">
                  <span>Medical Notes</span>

                  <button
                    type="button"
                    className={`btn ${isListening ? "btn-secondary" : "btn-primary"} btn-sm`}
                    onClick={isListening ? stopNotesDictation : startNotesDictation}
                    disabled={!sttSupported}
                  >
                    {isListening ? "Stop 🎤" : "Dictate 🎤"}
                  </button>
                </label>

                <textarea
                  name="recordData"
                  rows="4"
                  placeholder="You can type or dictate here..."
                  value={formData.recordData}
                  onChange={handleChange}
                />

                {isListening && (
                  <small className="listening-hint">
                    Listening… {interimText ? `(${interimText})` : ""}
                  </small>
                )}
              </div>

              <div className="medical-modal-footer">
                <button type="button" className="btn btn-ghost" onClick={resetForm}>
                  Cancel
                </button>

                <button type="submit" className="btn btn-primary">
                  {panelMode === "add" ? "Create" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorMedicalRecords;
