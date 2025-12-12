// src/components/DoctorLogin.js
import React, { useState } from 'react';
import axios from 'axios';
import '../Login.css';
import { useNavigate } from 'react-router-dom';

function DoctorLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        'http://localhost:5000/api/doctor/login',
        formData
      );

      if (response.data.doctorId) {
        // Save doctorId
        localStorage.setItem('doctorId', response.data.doctorId);

        // Redirect to doctor dashboard
        navigate(`/doctor-dashboard/${response.data.doctorId}`);
      }

    } catch (error) {
      alert('Doctor Login failed: ' + (error.response?.data?.error || 'Unknown error'));
    }
  };

  return (
    <div className="login-container">
      <h2>Doctor Login</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default DoctorLogin;
