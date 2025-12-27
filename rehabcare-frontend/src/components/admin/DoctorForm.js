import React, { useState, useEffect, useMemo } from "react";
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
    password: "",
  });

  const [error, setError] = useState("");

  // ===== VALIDATION REGEX =====
  const emailRegex = useMemo(() => /^[a-zA-Z0-9._%+-]+@gmail\.com$/, []);
  const phoneRegex = useMemo(() => /^01[0-9]{9}$/, []);

  // ===== DOB LIMITS (today + 120 years ago) =====
  const { minDate, maxDate } = useMemo(() => {
    const today = new Date();
    const max = today.toISOString().split("T")[0];

    const min = new Date(
      today.getFullYear() - 120,
      today.getMonth(),
      today.getDate()
    )
      .toISOString()
      .split("T")[0];

    return { minDate: min, maxDate: max };
  }, []);

  useEffect(() => {
    setError("");
    if (doctor) {
      setForm({
        firstName: doctor.first_name || "",
        lastName: doctor.last_name || "",
        email: (doctor.email || "").toLowerCase(),
        phone: doctor.phone || "",
        specialization: doctor.specialization || "",
        dateOfBirth: doctor.date_of_birth || "",
        password: "",
      });
    } else {
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        specialization: "",
        dateOfBirth: "",
        password: "",
      });
    }
  }, [doctor]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // email -> force lowercase
    if (name === "email") {
      setForm((prev) => ({ ...prev, email: value.toLowerCase() }));
      return;
    }

    // phone -> digits only + max 11
    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 11);
      setForm((prev) => ({ ...prev, phone: digitsOnly }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // ===== EMAIL VALIDATION =====
    if (!emailRegex.test(form.email)) {
      setError("Email must be a valid Gmail address (example@gmail.com)");
      return;
    }

    // ===== PHONE VALIDATION =====
    if (!phoneRegex.test(form.phone)) {
      setError("Phone number must be 11 digits and start with 01");
      return;
    }

    // ===== DOB VALIDATION =====
    if (!form.dateOfBirth) {
      setError("Date of birth is required");
      return;
    }
    if (form.dateOfBirth < minDate || form.dateOfBirth > maxDate) {
      setError(`Date of birth must be between ${minDate} and ${maxDate}`);
      return;
    }

    try {
      if (mode === "add") {
        await axios.post(`${API}/api/admin/doctors`, form);
      } else {
        await axios.put(`${API}/api/admin/doctors/${doctor.doctor_id}`, form);
      }

      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save doctor");
    }
  };

  return (
    <form className="doctor-form" onSubmit={handleSubmit}>
      <input
        name="firstName"
        placeholder="First Name"
        value={form.firstName}
        onChange={handleChange}
        required
      />

      <input
        name="lastName"
        placeholder="Last Name"
        value={form.lastName}
        onChange={handleChange}
        required
      />

      <input
        name="email"
        type="email"
        placeholder="example@gmail.com"
        value={form.email}
        onChange={handleChange}
        required
      />

      <input
        name="phone"
        type="tel"
        placeholder="01XXXXXXXXX"
        value={form.phone}
        onChange={handleChange}
        maxLength={11}
        required
      />

      <input
        name="specialization"
        placeholder="Specialization"
        value={form.specialization}
        onChange={handleChange}
      />

      <input
        type="date"
        name="dateOfBirth"
        value={form.dateOfBirth}
        onChange={handleChange}
        min={minDate}
        max={maxDate}
        required
      />

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

      {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}

      <div className="form-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>

        <button type="submit">{mode === "add" ? "Create Doctor" : "Save Changes"}</button>
      </div>
    </form>
  );
}

export default DoctorForm;
