import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function DoctorRegistration() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    specialization: "",
    phone: ""
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/api/register-doctor",
        formData
      );

      setSuccess("Doctor Registered Successfully!");
      setError("");

      navigate(`/doctor/${res.data.doctorId}`);  // redirect after registration
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
      setSuccess("");
    }
  };

  return (
    <div className="registration-container">
      <h2>Doctor Registration</h2>

      <form onSubmit={handleSubmit} className="registration-form">

        <input name="username" placeholder="Username"
               value={formData.username} onChange={handleChange} required />

        <input name="email" type="email" placeholder="Email"
               value={formData.email} onChange={handleChange} required />

        <input name="password" type="password" placeholder="Password"
               value={formData.password} onChange={handleChange} required />

        <input name="first_name" placeholder="First Name"
               value={formData.first_name} onChange={handleChange} required />

        <input name="last_name" placeholder="Last Name"
               value={formData.last_name} onChange={handleChange} required />

        <input name="specialization" placeholder="Specialization"
               value={formData.specialization} onChange={handleChange} required />

        <input name="phone" placeholder="Phone"
               value={formData.phone} onChange={handleChange} required />

        <button type="submit">Register Doctor</button>
      </form>

      {error && <p className="error-msg">{error}</p>}
      {success && <p className="success-msg">{success}</p>}
    </div>
  );
}

export default DoctorRegistration;

