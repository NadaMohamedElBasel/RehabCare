import logo from './logo.svg';
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

// CRITICAL FIX: Added .js extension to all local component imports
import PatientRegistration from './components/PatientRegistration.js';
import PatientProfile from './components/PatientProfile.js';
import AppointmentScheduler from './components/AppointmentScheduler.js';
import StaffAppointmentManager from './components/StaffAppointmentManager.js';
import MedicalRecords from './components/MedicalRecords.js';
import Prescriptions from './components/Prescriptions.js';
import AdminBillingManager from './components/AdminBillingManager.js';
import Billing from './components/Billing.js';
import './App.css';
//import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage.js';
import Login from './components/Login.js';


function App() {
  return (
    <Router>
      <div className="app">
        {/* <Navbar /> */}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<PatientRegistration />} />
          <Route path="/login" element={<Login />} />
          <Route path="/patient-dashboard/:patientId/*" element={<PatientProfile />} />
          <Route path="/appointments/:patientId" element={<AppointmentScheduler />} />
          <Route path="/records/:patientId" element={<MedicalRecords />} />
          <Route path="/prescriptions/:patientId" element={<Prescriptions />} />
          <Route path="/billing/:patientId" element={<Billing />} />
          <Route path="/staff/appointments" element={<StaffAppointmentManager />} />
          <Route path="/admin/billing" element={<AdminBillingManager />}/>
        </Routes>
      </div>
    </Router>
  );
}

export default App;