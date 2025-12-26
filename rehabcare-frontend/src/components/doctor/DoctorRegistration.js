// src/components/DoctorRegistration.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function DoctorRegistration() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    specialization: '',
    phone: '',
    dateOfBirth: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle form input change
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Submit registration
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        password: formData.password,
        specialization: formData.specialization,
        phone: formData.phone,
        date_of_birth: formData.dateOfBirth
      };

      const response = await axios.post(
        'http://localhost:5000/api/doctor/register',
        payload
      );

      setSuccess(response.data.message);
      setError('');

      // Store doctorId
      localStorage.setItem('doctorId', response.data.doctorId);

      // Redirect to doctor dashboard
      navigate(`/doctor-dashboard/${response.data.doctorId}`);

    } catch (err) {
      setError(err.response?.data?.error || 'Doctor registration failed');
      setSuccess('');
    }
  };

  return (
    <div className="registration-container">
      <h2>Doctor Registration</h2>

      <form onSubmit={handleSubmit}>
        
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

        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleInputChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleInputChange}
          required
        />

        <input
          type="text"
          name="specialization"
          placeholder="Specialization (e.g., Neurology)"
          value={formData.specialization}
          onChange={handleInputChange}
          required
        />

        <input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleInputChange}
          pattern="[0-9]+"
          required
        />

        <input
          type="date"
          name="dateOfBirth"
          value={formData.dateOfBirth}
          onChange={handleInputChange}
        />

        <button type="submit">Register</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
    </div>
  );
}

export default DoctorRegistration;

