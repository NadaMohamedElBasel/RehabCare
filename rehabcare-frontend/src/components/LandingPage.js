// // src/components/LandingPage.js
// import React from 'react';
// //import Navbar from './Navbar';
// import './LandingPage.css';

// // function LandingPage() {
// //   return (
// //     <div className="landing-container">
// //       <Navbar />
// //       <div className="landing-content">
// //         <h2>Welcome to RehabCare Portal</h2>
// //         <p>Please choose an option to get started:</p>
// //         <div className="landing-options">
// //           <a href="/register" className="option-button">Register</a>
// //           <a href="/login" className="option-button">Login</a>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }

// function LandingPage() {
//   return (
//     <div className="landing-container">
//       <div className="landing-content">
//         <h2>Welcome to RehabCare Portal</h2>
//         <p>Please choose an option to get started:</p>
//         <div className="landing-options">
//           <a href="/register" className="option-button">Register</a>
//           <a href="/login" className="option-button">Login</a>
//         {/* NEW: Doctor Register */}
//           <a href="/doctor-login" className="option-button doctor-btn">
//             Doctor Login
//           </a>
//         {/* Admin login */}
//           <a href="/admin-login" className="option-button doctor-btn">
//             Admin Login
//           </a>

//         </div>
//       </div>
//     </div>
//   );
// }

// export default LandingPage;


import React from 'react';
import './LandingPage.css';

function LandingPage() {
  // You can later fetch this from API (/api/doctors/public or similar)
  // For now it's static – matches your provided table
  const doctors = [
    { id: 1,    name: 'Dr. Ahmed Mahmoud',      specialization: 'Orthopedic' },
    { id: 201,  name: 'Dr. Ali Hassan',          specialization: 'Physiotherapy' },
    { id: 202,  name: 'Dr. Mona Khaled',         specialization: 'Spine Rehabilitation' },
    { id: 203,  name: 'Dr. Sara Ibrahim',        specialization: 'Pediatric Therapy' },
    { id: 204,  name: 'Dr. Omar Saeed',          specialization: 'Neurological Rehabilitation' },
    { id: 205,  name: 'Dr. Lina Fahmy',          specialization: 'Speech Therapy' },
    { id: 206,  name: 'Dr. Kareem Nabil',        specialization: 'Vestibular Therapy' },
    { id: 207,  name: 'Dr. Dina Mostafa',        specialization: 'Hand Therapy' },
    { id: 2,    name: 'Dr. Hassan Mousa',        specialization: 'Physiotherapy' },
    { id: 3,    name: 'Dr. Yasmine Adel',        specialization: 'Physiotherapy' },
    { id: 5,    name: 'Dr. Karim Nader',         specialization: 'Physiotherapy' },
    { id: 7,    name: 'Dr. Norah Samir',         specialization: 'Speech Therapy' },
    { id: 9,    name: 'Dr. Ramy Hassan',         specialization: 'Occupational Therapy' },
    { id: 10,   name: 'Dr. Fatma Youssef',       specialization: 'Occupational Therapy' },
  ];

  return (
    <div className="landing-container">
      <header className="hero-section">
        <h1>RehabCare Rehabilitation Center</h1>
        <p className="tagline">
          Personalized recovery journeys with expert care and modern facilities
        </p>
      </header>

      <section className="about-section">
        <h2>Welcome to RehabCare</h2>
        <p>
          We are a specialized rehabilitation center focused on orthopedic, neurological, 
          pediatric, and post-surgical recovery. Our multidisciplinary team combines 
          advanced therapy techniques, personalized treatment plans, and compassionate 
          support to help every patient regain strength, mobility, and confidence.
        </p>
        <p>
          Whether you're recovering from surgery, managing a chronic condition, or 
          working on improving daily function — we're here to support you every step of the way.
        </p>
      </section>

      <section className="doctors-section">
        <h2>Meet Our Specialist Doctors</h2>
        <p className="doctors-hint">
          You can select your preferred doctor during registration or scheduling.
          Doctor ID is required when booking follow-up sessions.
        </p>

        <div className="doctors-grid">
          {doctors.map((doc) => (
            <div key={doc.id} className="doctor-card">
              <div className="doctor-name">{doc.name}</div>
              <div className="doctor-spec">{doc.specialization}</div>
              <div className="doctor-id">ID: {doc.id}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <h2>Get Started Today</h2>
        <p>Choose how you'd like to begin your journey with us:</p>
        <div className="landing-options">
          <a href="/register"      className="option-button patient-btn">Patient Register</a>
          <a href="/login"         className="option-button patient-btn">Patient Login</a>
          <a href="/doctor-login"  className="option-button doctor-btn">Doctor Login</a>
          <a href="/admin-login"   className="option-button admin-btn">Admin Login</a>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;