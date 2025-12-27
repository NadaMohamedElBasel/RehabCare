import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AdminDoctors.css";
import DoctorForm from "./DoctorForm";

const API = "http://127.0.0.1:5000";

function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [panelMode, setPanelMode] = useState(null); // null | "add" | "edit"
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [search, setSearch] = useState("");

  const fetchDoctors = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/doctors`);
      setDoctors(res.data);
      setFilteredDoctors(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFilteredDoctors(
      doctors.filter(
        (d) =>
          d.first_name.toLowerCase().includes(q) ||
          d.last_name.toLowerCase().includes(q) ||
          (d.specialization || "").toLowerCase().includes(q) ||
          d.email.toLowerCase().includes(q)
      )
    );
  }, [search, doctors]);

  const deleteDoctor = async (doctorId) => {
    if (!window.confirm("Are you sure you want to delete this doctor?")) return;

    try {
      await axios.delete(`${API}/api/admin/doctors/${doctorId}`);
      setDoctors((prev) => prev.filter((d) => d.doctor_id !== doctorId));
    } catch (err) {
      alert("Delete failed");
    }
  };

  const closePanel = () => {
    setPanelMode(null);
    setSelectedDoctor(null);
  };

  return (
    <div className="doctors-page">
      {/* ===== HEADER ===== */}
      <div className="doctors-header">
        <div className="header-left">
          <h3>Doctors Management</h3>
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
              placeholder="Search doctors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className="fb-add-btn"
            title="Add Doctor"
            onClick={() => {
              setPanelMode("add");
              setSelectedDoctor(null);
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* ===== MODAL TAB (ADD / EDIT) ===== */}
      {panelMode && (
        <div className="top-panel" onClick={closePanel}>
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header inside card */}
            <div className="panel-header">
              <h4>
                {panelMode === "add" ? "Add Doctor" : "Edit Doctor"}
              </h4>

              <button className="close-btn" onClick={closePanel}>
                ✕
              </button>
            </div>

            {/* body (scroll) */}
            <div className="admin-modal-body">
              <DoctorForm
                mode={panelMode}
                doctor={selectedDoctor}
                onCancel={closePanel}
                onSuccess={() => {
                  fetchDoctors();
                  closePanel();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ===== TABLE ===== */}
      {loading ? (
        <p>Loading...</p>
      ) : filteredDoctors.length === 0 ? (
        <p className="empty">No doctors found.</p>
      ) : (
        <div className="table-wrapper">
          <table className="doctors-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Specialization</th>
                <th>Email</th>
                <th>Phone</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredDoctors.map((d) => (
                <tr key={d.doctor_id}>
                  <td>{d.doctor_id}</td>
                  <td>{d.first_name} {d.last_name}</td>
                  <td>
                    <span className="badge">{d.specialization || "N/A"}</span>
                  </td>
                  <td className="email-cell">{d.email}</td>
                  <td>{d.phone || "-"}</td>
                  <td>
                    <div className="actions">
                      <button
                        className="edit-btn"
                        onClick={() => {
                          setSelectedDoctor(d);
                          setPanelMode("edit");
                        }}
                      >
                        Edit
                      </button>

                      <button
                        className="delete-btn"
                        onClick={() => deleteDoctor(d.doctor_id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      )}
    </div>
  );
}

export default AdminDoctors;
