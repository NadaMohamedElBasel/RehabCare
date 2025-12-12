// src/components/LandingPage.js
import React from 'react';
//import Navbar from './Navbar';
import './LandingPage.css';

// function LandingPage() {
//   return (
//     <div className="landing-container">
//       <Navbar />
//       <div className="landing-content">
//         <h2>Welcome to RehabCare Portal</h2>
//         <p>Please choose an option to get started:</p>
//         <div className="landing-options">
//           <a href="/register" className="option-button">Register</a>
//           <a href="/login" className="option-button">Login</a>
//         </div>
//       </div>
//     </div>
//   );
// }

function LandingPage() {
  return (
    <div className="landing-container">
      <div className="landing-content">
        <h2>Welcome to RehabCare Portal</h2>
        <p>Please choose an option to get started:</p>
        <div className="landing-options">
          <a href="/register" className="option-button">Register</a>
          <a href="/login" className="option-button">Login</a>
        {/* NEW: Doctor Register */}
          <a href="/doctor-register" className="option-button doctor-btn">
            Doctor Register
          </a>

        </div>
      </div>
    </div>
  );
}

export default LandingPage;