import React, { useEffect, useState } from "react";
import axios from "axios"; 
import "./DoctorMedicalRecords.css";

const API = "http://localhost:5000";

function DoctorMedicalRecords({ doctorId }) {
  /* ================= STATE ================= */
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [records, setRecords] = useState([]);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [panelMode, setPanelMode] = useState(null); // "add" | "edit" | null
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
  category: "",
  recordType: "",
  recordData: "",
  gender: "",
  weight: "",
  height: "",
  bpSystolic: "",
  bpDiastolic: "",
});


  /* ================= LOAD PATIENTS ================= */
  useEffect(() => {
    if (!doctorId) return;

    const fetchPatients = async () => {
      try {
        const res = await axios.get(
          `${API}/api/doctor/${doctorId}/patients`
        );
        setPatients(res.data);
        setFilteredPatients(res.data);
      } catch {
        setError("Failed to load patients");
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [doctorId]);

  /* ================= LOAD RECORDS ================= */
  const fetchRecords = async (patientId) => {
    try {
      const res = await axios.get(
        `${API}/api/doctor/${doctorId}/patients/${patientId}/medical-records`
      );
      setRecords(res.data);
    } catch {
      setError("Failed to load medical records");
    }
  };

  /* ================= SEARCH ================= */
  useEffect(() => {
    const q = search.toLowerCase();
    setFilteredPatients(
      patients.filter(
        (p) =>
          p.first_name.toLowerCase().includes(q) ||
          p.last_name.toLowerCase().includes(q)
      )
    );
  }, [search, patients]);

  /* ================= FORM HELPERS ================= */
  const handleChange = (e) => {
  const { name, value, type } = e.target;

  // Allow only numbers for numeric fields
  if (
    ["weight", "height", "bpSystolic", "bpDiastolic"].includes(name)
  ) {
    if (value !== "" && isNaN(value)) return;
  }

  // Reset diagnosis when category changes
  if (name === "category") {
    setFormData((prev) => ({
      ...prev,
      category: value,
      recordType: "",
    }));
    return;
  }

  setFormData((prev) => ({
    ...prev,
    [name]: type === "radio" ? value : value.trim(),
  }));
};

const resetForm = () => {
  setFormData({
    category: "",
    recordType: "",
    recordData: "",
    visitDate: "",
    department: "",
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
const saveRecord = async (e) => {
  e.preventDefault();
  setError("");

  if (!formData.recordType) {
    setError("Diagnosis is required");
    return;
  }

  const vitals = {};

  if (formData.gender) vitals.gender = formData.gender;
  if (formData.weight) vitals.weight = Number(formData.weight);
  if (formData.height) vitals.height = Number(formData.height);

  if (formData.bpSystolic && formData.bpDiastolic) {
    vitals.bloodPressure = `${formData.bpSystolic}/${formData.bpDiastolic}`;
  }

  if (formData.recordData) {
    vitals.notes = formData.recordData.trim();
  }

  const payload = {
    recordType: formData.recordType,
    department: formData.category,
    recordData: JSON.stringify(vitals),
  };

  try {
    if (panelMode === "add") {
      await axios.post(
        `${API}/api/doctor/${doctorId}/patients/${selectedPatient.patient_id}/medical-records`,
        payload
      );
    } else {
      await axios.put(
        `${API}/api/doctor/${doctorId}/medical-records/${selectedRecord.record_id}`,
        payload
      );
    }

    fetchRecords(selectedPatient.patient_id);
    resetForm();
  } catch (err) {
    setError("Failed to save medical record");
  }
};
const parseRecordData = (data) => {
  if (!data || typeof data !== "string") return {};

  try {
    const parsed = JSON.parse(data);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
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

        {loading ? (
          <p>Loading...</p>
        ) : (
          <ul className="patients-list">
            {filteredPatients.map((p) => (
              <li
                key={p.patient_id}
                className={
                  selectedPatient?.patient_id === p.patient_id ? "active" : ""
                }
                onClick={() => {
                if (selectedPatient?.patient_id === p.patient_id) {
                    // UNSELECT
                    setSelectedPatient(null);
                    setRecords([]);
                    setPanelMode(null);
                    resetForm();
                } else {
                    // SELECT
                    setSelectedPatient(p);
                    setRecords([]);
                    setPanelMode(null);
                    resetForm();
                    fetchRecords(p.patient_id);
                }
                }}

              >
                <span className="patient-name">
                  {p.first_name} {p.last_name}
                </span>
                <span className="patient-id"> - ID {p.patient_id}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* ========== RIGHT PANEL: RECORDS ========== */}
      <section className="records-panel">
        {!selectedPatient ? (
          <p className="hint">Select a patient to view medical records</p>
        ) : (
          <>
            <div className="records-header-row">
            <h3 className="patient-title">
                {selectedPatient.first_name} {selectedPatient.last_name}
            </h3>

            <button
                className="btn btn-primary"
                onClick={() => {
                resetForm();
                setPanelMode("add");
                }}
            >
                + Add Record
            </button>
            </div>



            {records.length === 0 ? (
              <p className="empty">No medical records found.</p>
            ) : (
              <div className="table-wrapper">
                  <table className="records-table">

                    <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Gender</th>
                        <th>Weight (kg)</th>
                        <th>Height (cm)</th>
                        <th>BP</th>
                        <th>Doctor Notes</th>
                        <th>Actions</th>
                        <th></th>
                    </tr>
                    </thead>
                    <tbody>
                        {records.map((r) => {
                        const data = parseRecordData(r.record_data);

                    return (
                    <tr key={r.record_id}>
                        {/* DATE */}
                        <td>{new Date(r.created_at).toLocaleDateString()}</td>

                        {/* TYPE */}
                        <td>{r.record_type}</td>

                        {/* GENDER */}
                        <td>{data.gender || "-"}</td>

                        {/* WEIGHT */}
                        <td>{data.weight ? `${data.weight}` : "-"}</td>

                        {/* HEIGHT */}
                        <td>{data.height ? `${data.height}` : "-"}</td>

                        {/* BLOOD PRESSURE */}
                        <td>{data.bloodPressure || "-"}</td>

                        {/* DOCTOR NOTES */}
                        <td className="notes-cell">
                        {data.notes || "-"}
                        </td>

                        {/* ACTIONS */}
                        <td>
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                            setSelectedRecord(r);
                            setFormData({
                                category: r.department || "",
                                recordType: r.record_type,
                                recordData: data.notes || "",
                                gender: data.gender || "",
                                weight: data.weight || "",
                                height: data.height || "",
                                bpSystolic: data.bloodPressure?.split("/")[0] || "",
                                bpDiastolic: data.bloodPressure?.split("/")[1] || "",
                            });
                            setPanelMode("edit");
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
          </>
        )}
      </section>

      {/* ========== ADD / EDIT PANEL ========== */}
      {panelMode && (
        <div className="top-panel">
          <div className="panel-header">
            <h4>
              {panelMode === "add" ? "Add Medical Record" : "Edit Medical Record"}
            </h4>
            <button className="close-btn" onClick={resetForm}>
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
                    onChange={handleChange}
                    />
                    <span>/</span>
                    <input
                    type="number"
                    name="bpDiastolic"
                    placeholder="80"
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
                    onChange={handleChange}
                />
                </div>

                <div>
                <label>Height (cm)</label>
                <input
                    type="number"
                    name="height"
                    placeholder="170"
                    onChange={handleChange}
                />
                </div>

            </div>

            {/* ===== SELECTS ===== */}
            <div className="form-row">
            <label>Category</label>
            <select
                name="category"
                value={formData.category || ""}
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
            <label>Diagnosis</label>
            <select
                name="recordType"
                value={formData.recordType}
                onChange={handleChange}
                required
                disabled={!formData.category}
            >
                <option value="">
                {formData.category ? "Select Diagnosis" : "Select Category First"}
                </option>

                {/* ===== ORTHOPEDIC ===== */}
                {formData.category === "orthopedic" && (
                <>
                    <option value="Low Back Pain">Low Back Pain</option>
                    <option value="Knee Osteoarthritis">Knee Osteoarthritis</option>
                    <option value="Shoulder Impingement">Shoulder Impingement</option>
                    <option value="Rotator Cuff Injury">Rotator Cuff Injury</option>
                    <option value="Meniscus Injury">Meniscus Injury</option>
                </>
                )}

                {/* ===== NEUROLOGICAL ===== */}
                {formData.category === "neurological" && (
                <>
                    <option value="Post Stroke Rehabilitation">Post Stroke Rehabilitation</option>
                    <option value="Paraplegia">Paraplegia</option>
                    <option value="Hemiplegia">Hemiplegia</option>
                    <option value="Parkinson’s Disease">Parkinson’s Disease</option>
                </>
                )}

                {/* ===== SPORTS ===== */}
                {formData.category === "sports" && (
                <>
                    <option value="ACL Injury">ACL Injury</option>
                    <option value="Muscle Strain">Muscle Strain</option>
                    <option value="Ankle Sprain">Ankle Sprain</option>
                    <option value="Tennis Elbow">Tennis Elbow</option>
                </>
                )}

                {/* ===== POST SURGICAL ===== */}
                {formData.category === "post_surgical" && (
                <>
                    <option value="Post Knee Replacement">Post Knee Replacement</option>
                    <option value="Post Hip Replacement">Post Hip Replacement</option>
                    <option value="Post ACL Reconstruction">Post ACL Reconstruction</option>
                </>
                )}

                {/* ===== FUNCTIONAL ===== */}
                {formData.category === "functional" && (
                <>
                    <option value="Gait Abnormality">Gait Abnormality</option>
                    <option value="Balance Disorder">Balance Disorder</option>
                    <option value="Chronic Pain Syndrome">Chronic Pain Syndrome</option>
                </>
                )}
            </select>
            </div>


            
            {/* ===== NOTES ===== */}
            <div className="form-row">
                <label>Medical Notes</label>
                <textarea
                name="recordData"
                rows="4"
                placeholder="Optional notes..."
                onChange={handleChange}
                />
            </div>

            <button className="btn btn-primary full-width">
                Save Record
            </button>

            </form>

        </div>
      )}
    </div>
  );
}

export default DoctorMedicalRecords;
