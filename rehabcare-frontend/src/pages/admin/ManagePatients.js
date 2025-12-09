// src/pages/admin/ManagePatients.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Admin.css";

function ManagePatients() {
  const [patients, setPatients] = useState([]);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    date_of_birth: "",
    phone_number: "",
    gender: ""
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/patients");
      setPatients(res.data);
    } catch (err) {
      console.error("Fetch patients error", err);
    }
  };

  const handleInput = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const savePatient = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(
          `http://localhost:5000/api/patients/${editingId}`,
          formData
        );
      } else {
        await axios.post("http://localhost:5000/api/patients", formData);
      }
      setEditingId(null);
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        date_of_birth: "",
        phone_number: "",
        gender: ""
      });
      fetchPatients();
    } catch (err) {
      console.error("Save patient error", err);
    }
  };

  const deletePatient = async (id) => {
    if (!window.confirm("Delete this patient?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/patients/${id}`);
      fetchPatients();
    } catch (err) {
      console.error("Delete patient error", err);
    }
  };

  return (
    <div className="admin-section">
      <h2>Manage Patients</h2>

      <form onSubmit={savePatient} className="admin-form">
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
          name="date_of_birth"
          type="date"
          value={formData.date_of_birth}
          onChange={handleInput}
        />
        <input
          name="phone_number"
          placeholder="Phone Number"
          value={formData.phone_number}
          onChange={handleInput}
        />
        <select
          name="gender"
          value={formData.gender}
          onChange={handleInput}
        >
          <option value="">Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>

        <button type="submit">
          {editingId ? "Update Patient" : "Add Patient"}
        </button>
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>DOB</th>
            <th>Phone</th>
            <th>Gender</th>
            <th>ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p.patient_id}>
              <td>
                {p.first_name} {p.last_name}
              </td>
              <td>{p.email}</td>
              <td>{p.date_of_birth}</td>
              <td>{p.phone_number}</td>
              <td>{p.gender}</td>
              <td>{p.patient_id}</td>
              <td>
                <button
                  className="btn-edit"
                  onClick={() => {
                    setEditingId(p.patient_id);
                    setFormData({
                      first_name: p.first_name,
                      last_name: p.last_name,
                      email: p.email,
                      date_of_birth: p.date_of_birth,
                      phone_number: p.phone_number,
                      gender: p.gender
                    });
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn-delete"
                  onClick={() => deletePatient(p.patient_id)}
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

export default ManagePatients;
