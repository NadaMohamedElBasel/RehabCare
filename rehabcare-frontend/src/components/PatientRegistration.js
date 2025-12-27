// src/components/PatientRegistration.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function PatientRegistration() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    dateOfBirth: '',
    phoneNumber: '',
    gender: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  const phoneRegex = /^01[0-9]{9}$/;
  const today = new Date();
  const maxDate = today.toISOString().split("T")[0]; 

  const minDate = new Date(
    today.getFullYear() - 120,
    today.getMonth(),
    today.getDate()
  ).toISOString().split("T")[0];



  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  // ===== EMAIL VALIDATION =====
  if (!emailRegex.test(formData.email)) {
    setError("Email must be a valid Gmail address (example@gmail.com)");
    setSuccess('');
    return;
  }
  if (!phoneRegex.test(formData.phoneNumber)) {
  setError("Phone number must be 11 digits and start with 01");
  setSuccess('');
  return;
}


  try {
    const response = await axios.post(
      'http://localhost:5000/api/register',
      formData
    );

    setSuccess(response.data.message);
    setError('');

    localStorage.setItem('patientId', response.data.patientId);
    navigate(`/patient-dashboard/${response.data.patientId}`);

  } catch (err) {
    setError(err.response?.data?.error || 'Registration failed');
    setSuccess('');
  }
};

  return (
    <div className="registration-container">
      <h2>Register</h2>
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
          placeholder="Email"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value.toLowerCase() })
          }
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
          type="date"
          name="dateOfBirth"
          value={formData.dateOfBirth}
          onChange={handleInputChange}
          min={minDate}
          max={maxDate}
          required
        />


        <div className="form-group">
          <input
            type="tel"
            name="phoneNumber"
            placeholder="01XXXXXXXXX"
            value={formData.phoneNumber}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              setFormData({ ...formData, phoneNumber: value });
            }}
            maxLength={11}
            required
          />

        </div>

        <div className="form-group">
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
        </div>

        <button type="submit">Register</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
    </div>
  );
}

export default PatientRegistration;