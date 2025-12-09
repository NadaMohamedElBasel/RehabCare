import logo from './logo.svg';
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PatientRegistration from './components/PatientRegistration';
import PatientProfile from './components/PatientProfile';
import AppointmentScheduler from './components/AppointmentScheduler';
import MedicalRecords from './components/MedicalRecords';
import Prescriptions from './components/Prescriptions';
import Billing from './components/Billing';
import './App.css';
//import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Login from './components/Login';


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
        </Routes>
      </div>
    </Router>
  );
}

export default App;
