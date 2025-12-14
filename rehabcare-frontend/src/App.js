import logo from './logo.svg';
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PatientRegistration from './components/PatientRegistration';
import PatientProfile from './components/PatientProfile';
import AppointmentScheduler from './components/AppointmentScheduler';
import MedicalRecords from './components/MedicalRecords';
import Prescriptions from './components/Prescriptions';
import Billing from './components/Billing';
import StaffAppointmentManager from "./components/StaffAppointmentManager";
import AdminBillingManager from "./components/AdminBillingManager";
import './App.css';
//import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Login from './components/Login';


// Doctor Components
import DoctorRegistration from './components/doctor/DoctorRegistration';
import DoctorLogin from './components/doctor/DoctorLogin';
import DoctorProfile from './components/doctor/DoctorProfile';
import DoctorAppointments from './components/doctor/DoctorAppointments';
import DoctorPrescriptions from './components/doctor/DoctorPrescriptions';

// Admin Components
import AdminLogin from "./components/admin/AdminLogin";
import AdminDashboard from "./components/admin/AdminDashboard";

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

// export default App;

// function App() {
//   return (
//     <Router>
//       <div className="app">
//         <h1>RehabCare Patient Portal</h1>
//         <Routes>
//           <Route path="/register" element={<PatientRegistration />} />
//           <Route path="/profile/:patientId" element={<PatientProfile />} />
//           <Route path="/appointments/:patientId" element={<AppointmentScheduler />} />
//           <Route path="/records/:patientId" element={<MedicalRecords />} />
//           <Route path="/prescriptions/:patientId" element={<Prescriptions />} />
//           <Route path="/billing/:patientId" element={<Billing />} />
//         </Routes>
//       </div>
//     </Router>
//   );
// }

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
          {/* ---------------------- */}        
          {/* DOCTOR ROUTES */}
          {/* ---------------------- */}
          <Route path="/doctor-register" element={<DoctorRegistration />} />
          <Route path="/doctor-login" element={<DoctorLogin />} />

          {/* Doctor Dashboard */}
          <Route path="/doctor-dashboard/:doctorId/*" element={<DoctorProfile />} />

          {/* Doctor Tools */}
          <Route path="/doctor/:doctorId/appointments" element={<DoctorAppointments />} />
          <Route path="/doctor/:doctorId/prescriptions" element={<DoctorPrescriptions />} />
          <Route path={"/staff/appointments"} element={<StaffAppointmentManager />} />
            <Route path={"/admin/billing"} element={<AdminBillingManager />} />
          
          {/* ---------------------- */}
          {/* ADMIN ROUTES */}
          {/* ---------------------- */}

          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-dashboard/:adminId" element={<AdminDashboard />} />


        </Routes>
      </div>
    </Router>
  );
}

export default App;
