import React, { useState, useEffect } from "react";
import axios from "axios";

const API = "http://127.0.0.1:5000";

function DoctorForm({ mode, doctor, onCancel, onSuccess }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialization: "",
    dateOfBirth: "",
    password: ""
  });

  useEffect(() => {
    if (doctor) {
      setForm({
        firstName: doctor.first_name || "",
        lastName: doctor.last_name || "",
        email: doctor.email || "",
        phone: doctor.phone || "",
        specialization: doctor.specialization || "",
        dateOfBirth: doctor.date_of_birth || "",
        password: ""
      });
    }
  }, [doctor]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === "add") {
      await axios.post(`${API}/api/admin/doctors`, form);
    } else {
      await axios.put(
        `${API}/api/admin/doctors/${doctor.doctor_id}`,
        form
      );
    }

    onSuccess();
  };

  return (
    <form className="doctor-form" onSubmit={handleSubmit}>
      <input name="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange} required />
      <input name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange} required />
      <input name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
      <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} />
      <input name="specialization" placeholder="Specialization" value={form.specialization} onChange={handleChange} />
      <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange}/>


      {mode === "add" && (
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />
      )}

      <div className="form-actions">
        <button type="submit">Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default DoctorForm;
