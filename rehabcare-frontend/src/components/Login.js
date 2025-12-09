// // src/components/Login.js
// import React, { useState } from 'react';
// import axios from 'axios';
// import './Login.css';
// import { useNavigate } from 'react-router-dom';

// function Login() {
//   const navigate = useNavigate();
//   const [formData, setFormData] = useState({
//     email: '',
//     password: ''
//   });

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   // const handleSubmit = async (e) => {
//   //   e.preventDefault();
//   //   try {
//   //     const response = await axios.post('http://127.0.0.1:5000/api/login', formData);
//   //     alert(`Login successful! Patient ID: ${response.data.patientId}`);
//   //     // Redirect or store patientId (e.g., using context or state management)
  
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//     //   const response = await fetch('http://localhost:5000/api/login', {
//     //     method: 'POST',
//     //     headers: { 'Content-Type': 'application/json' },
//     //     body: JSON.stringify(formData)
//     //   });
      
//     //   if (response.ok) {
//     //     const data = await response.json();
//     //     localStorage.setItem('patientId', data.patientId);
//     //     navigate(`/patient-dashboard`);
//     //   } else {
//     //     // Handle error
//     //   }
//     // //   if (response.data.patientId) {
//     // //   localStorage.setItem('patientId', response.data.patientId);
//     // //   navigate(`/patient-dashboard/${response.data.patientId}`);
//     // // }

//   const response = await axios.post('http://localhost:5000/api/login', formData);
      
//       if (response.data.patientId) {
//         // Store patientId in localStorage
//         localStorage.setItem('patientId', response.data.patientId);
//         // Redirect to patient dashboard WITH the patientId in URL
//         navigate(`/patient/${response.data.patientId}`);
//       }

//     } catch (error) {
//       alert('Login failed: ' + (error.response?.data?.error || 'Unknown error'));
//     }
//   };

//   return (
//     <div className="login-container">
//       <h2>Login</h2>
//       <form onSubmit={handleSubmit}>
//         <input
//           type="email"
//           name="email"
//           placeholder="Email"
//           value={formData.email}
//           onChange={handleChange}
//           required
//         />
//         <input
//           type="password"
//           name="password"
//           placeholder="Password"
//           value={formData.password}
//           onChange={handleChange}
//           required
//         />
//         <button type="submit">Login</button>
//       </form>
//     </div>
//   );
// }

// export default Login;

import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';
import { useNavigate } from 'react-router-dom';

function Login() {
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
      const response = await axios.post('http://127.0.0.1:5000/api/login', formData);

      const data = response.data;

      // Save general user data
      localStorage.setItem("role", data.role);
      localStorage.setItem("userId", data.userId);

      // PATIENT LOGIN
      if (data.role === "PATIENT") {
        localStorage.setItem("patientId", data.patientId);
        return navigate(`/patient/${data.patientId}`);
      }

      // DOCTOR LOGIN
      if (data.role === "DOCTOR") {
        localStorage.setItem("doctorId", data.doctorId);
        return navigate(`/doctor/${data.doctorId}`);
      }

      // ADMIN LOGIN
      if (data.role === "ADMIN") {
        localStorage.setItem("adminId", data.adminId);
        return navigate(`/admin/${data.adminId}`);
      }

    } catch (error) {
      alert("Login failed: " + (error.response?.data?.error || "Unknown error"));
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>

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

export default Login;
