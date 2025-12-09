import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

//
// =============== PUBLIC ===============
//
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import PatientRegistration from './pages/patient/PatientRegistration';
import DoctorRegistration from "./pages/doctor/DoctorRegistration";

//
// =============== PATIENT ===============
//
import PatientLayout from './layouts/PatientLayout';
import PatientProfile from './pages/patient/PatientProfile';

//
// =============== DOCTOR ===============
//  
import DoctorLayout from './layouts/DoctorLayout';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import PatientList from './pages/doctor/PatientList';
import PatientDetails from './pages/doctor/PatientDetails';
import AppointmentSchedule from './pages/doctor/AppointmentSchedule';

//
// =============== ADMIN ===============
//
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';
import ManageDoctors from './pages/admin/ManageDoctors';
import ManagePatients from './pages/admin/ManagePatients';
import ManageAppointments from './pages/admin/ManageAppointments';
import ManageBilling from './pages/admin/ManageBilling';

import './App.css';

function App() {
  return (
    <Router>
      <Routes>

        {/* ================= PUBLIC ROUTES ================= */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<PatientRegistration />} />
        <Route path="/register-doctor" element={<DoctorRegistration />} />

        {/* ================= PATIENT DASHBOARD ================= */}
        <Route 
          path="/patient/:patientId"
          element={
            <PatientLayout>
              <PatientProfile />
            </PatientLayout>
          }
        />

        {/* ================= DOCTOR ROUTES ================= */}

        <Route
          path="/doctor"
          element={
            <DoctorLayout>
              <DoctorDashboard />
            </DoctorLayout>
          }
        />

        <Route
          path="/doctor/:doctorId"
          element={
            <DoctorLayout>
              <DoctorDashboard />
            </DoctorLayout>
          }
        />

        <Route
          path="/doctor/patients"
          element={
            <DoctorLayout>
              <PatientList />
            </DoctorLayout>
          }
        />

        <Route
          path="/doctor/patient/:id"
          element={
            <DoctorLayout>
              <PatientDetails />
            </DoctorLayout>
          }
        />

        <Route
          path="/doctor/appointments"
          element={
            <DoctorLayout>
              <AppointmentSchedule />
            </DoctorLayout>
          }
        />

        {/* ================= ADMIN ROUTES ================= */}
        <Route
          path="/admin"
          element={
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          }
        />

        <Route
          path="/admin/users"
          element={
            <AdminLayout>
              <ManageUsers />
            </AdminLayout>
          }
        />

        <Route
          path="/admin/doctors"
          element={
            <AdminLayout>
              <ManageDoctors />
            </AdminLayout>
          }
        />

        <Route
          path="/admin/patients"
          element={
            <AdminLayout>
              <ManagePatients />
            </AdminLayout>
          }
        />

        <Route
          path="/admin/appointments"
          element={
            <AdminLayout>
              <ManageAppointments />
            </AdminLayout>
          }
        />

        <Route
          path="/admin/billing"
          element={
            <AdminLayout>
              <ManageBilling />
            </AdminLayout>
          }
        />

      </Routes>
    </Router>
  );
}

export default App;
