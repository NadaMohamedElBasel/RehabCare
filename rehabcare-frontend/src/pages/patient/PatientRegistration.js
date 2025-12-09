// PatientRegistration.js
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./PatientRegistration.css";

function PatientRegistration() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    dateOfBirth: "",
    phoneNumber: "",
    gender: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Handle Input Change
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Submit Registration
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        password: formData.password,
        date_of_birth: formData.dateOfBirth,
        phone_number: formData.phoneNumber,
        gender: formData.gender,
      };

      const res = await axios.post(
        "http://127.0.0.1:5000/api/register",
        payload
      );

      setSuccess(res.data.message);
      setError("");

      localStorage.setItem("patientId", res.data.patientId);

      navigate(`/patient/${res.data.patientId}`);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
      setSuccess("");
    }
  };

  return (
    <div className="registration-container">
      <h2>Create Patient Account</h2>

      <form className="registration-form" onSubmit={handleSubmit}>
        {/* Name Fields */}
        <div className="input-group">
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={formData.firstName}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleInputChange}
            required
          />
        </div>

        {/* Email */}
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleInputChange}
          required
        />

        {/* Password */}
        <input
          type="password"
          name="password"
          placeholder="Create Password"
          value={formData.password}
          onChange={handleInputChange}
          required
        />

        {/* Date of Birth */}
        <label>Date of Birth</label>
        <input
          type="date"
          name="dateOfBirth"
          value={formData.dateOfBirth}
          onChange={handleInputChange}
        />

        {/* Phone Number */}
        <input
          type="tel"
          name="phoneNumber"
          placeholder="Phone Number"
          value={formData.phoneNumber}
          onChange={handleInputChange}
          pattern="[0-9]+"
          required
        />

        {/* Gender */}
        <select
          name="gender"
          value={formData.gender}
          onChange={handleInputChange}
          required
        >
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>

        <button type="submit" className="register-btn">
          Register
        </button>
      </form>

      {error && <p className="error-msg">{error}</p>}
      {success && <p className="success-msg">{success}</p>}
    </div>
  );
}

export default PatientRegistration;
