// src/pages/admin/ManageDoctors.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Admin.css";

function ManageDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    specialization: "",
    phone: "",
    date_of_birth: ""
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/doctors");
      setDoctors(res.data);
    } catch (err) {
      console.error("Fetch doctors error", err);
    }
  };

  const handleInput = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const saveDoctor = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        // UPDATE doctor
        await axios.put(
          `http://localhost:5000/api/doctors/${editingId}`,
          formData
        );
      } else {
        // ADD doctor
        await axios.post("http://localhost:5000/api/doctors", formData);
      }

      // Reset form and reload
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        specialization: "",
        phone: "",
        date_of_birth: ""
      });
      setEditingId(null);
      fetchDoctors();
    } catch (err) {
      console.error("Save doctor error", err);
    }
  };

  const deleteDoctor = async (id) => {
    if (!window.confirm("Delete this doctor?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/doctors/${id}`);
      fetchDoctors();
    } catch (err) {
      console.error("Delete doctor error", err);
    }
  };

  return (
    <div className="admin-section">
      <h2>Manage Doctors</h2>

      {/* ===== Add / Edit Form ===== */}
      <form onSubmit={saveDoctor} className="admin-form">
        <input
          name="first_name"
          placeholder="First Name"
          value={formData.first_name}
          onChange={handleInput}
          required
        />
        <input
          name="last_name"
          placeholder="Last Name"
          value={formData.last_name}
          onChange={handleInput}
          required
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleInput}
          required
        />
        <input
          name="specialization"
          placeholder="Specialization (e.g., Physio Therapy)"
          value={formData.specialization}
          onChange={handleInput}
        />
        <input
          name="phone"
          placeholder="Phone"
          value={formData.phone}
          onChange={handleInput}
        />
        <input
          name="date_of_birth"
          type="date"
          value={formData.date_of_birth}
          onChange={handleInput}
        />

        <button type="submit">
          {editingId ? "Update Doctor" : "Add Doctor"}
        </button>
      </form>

      {/* ===== Doctors Table ===== */}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Specialization</th>
            <th>Phone</th>
            <th>DOB</th>
            <th>ID</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {doctors.map((d) => (
            <tr key={d.doctor_id}>
              <td>
                {d.first_name} {d.last_name}
              </td>
              <td>{d.email}</td>
              <td>{d.specialization}</td>
              <td>{d.phone}</td>
              <td>{d.date_of_birth}</td>
              <td>{d.doctor_id}</td>

              <td>
                <button
                  className="btn-edit"
                  onClick={() => {
                    setEditingId(d.doctor_id);
                    setFormData({
                      first_name: d.first_name,
                      last_name: d.last_name,
                      email: d.email,
                      specialization: d.specialization,
                      phone: d.phone,
                      date_of_birth: d.date_of_birth
                    });
                  }}
                >
                  Edit
                </button>

                <button
                  className="btn-delete"
                  onClick={() => deleteDoctor(d.doctor_id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ManageDoctors;
