import React, { useState } from "react";
import axios from "axios";

const API = "http://127.0.0.1:5000";

function DoctorModal({ title, doctor, onClose, onSuccess }) {
  const [form, setForm] = useState({
    firstName: doctor?.first_name || "",
    lastName: doctor?.last_name || "",
    email: doctor?.email || "",
    password: "",
    specialization: doctor?.specialization || "",
    phone: doctor?.phone || "",
    dateOfBirth: doctor?.date_of_birth || "",
  });

  const isEdit = Boolean(doctor);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        await axios.put(
          `${API}/api/admin/doctors/${doctor.doctor_id}`,
          form
        );
      } else {
        await axios.post(`${API}/api/admin/doctors`, form);
      }

      onSuccess();
      onClose();
    } catch (err) {
      alert("Operation failed");
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>{title}</h3>

        <form onSubmit={handleSubmit}>
          <input name="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange} required />
          <input name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange} required />
          <input name="email" placeholder="Email" value={form.email} onChange={handleChange} required />

          {!isEdit && (
            <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
          )}

          <input name="specialization" placeholder="Specialization" value={form.specialization} onChange={handleChange} />
          <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} />
          <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} />

          <div className="actions">
            <button type="submit">Save</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DoctorModal;
