import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import '../PatientProfile.css';  

import CDSSModule from "./CDSSModule";
import DICOMViewer from "./DICOMViewer";
import DoctorAppointments from './DoctorAppointments';
import DoctorPrescriptions from './DoctorPrescriptions';
import MedicalRecords from '../MedicalRecords';
import DoctorPatients from "./DoctorPatients";


function DoctorProfile() {
  const { doctorId } = useParams();
  const [activeTab, setActiveTab] = useState('profile');

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: '',
    dateOfBirth: ''
  });

  const [formData, setFormData] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const id = doctorId || localStorage.getItem('doctorId');
        if (!id) return;

        const res = await axios.get(`http://localhost:5000/api/doctor/${id}`);
        const d = res.data;

        const mapped = {
          firstName: d.first_name || '',
          lastName: d.last_name || '',
          email: d.email || '',
          phone: d.phone || '',
          specialization: d.specialization || '',
          dateOfBirth: d.date_of_birth || ''
        };

        setProfile(mapped);
        setFormData(mapped);

      } catch (err) {
        console.error(err);
        setError('Failed to load doctor profile.');
      }
    };

    fetchDoctor();
  }, [doctorId]);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const id = doctorId || localStorage.getItem('doctorId');

      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        specialization: formData.specialization,
        date_of_birth: formData.dateOfBirth
      };

      const res = await axios.put(`http://localhost:5000/api/doctor/${id}`, payload);

      const updated = {
        firstName: res.data.first_name,
        lastName: res.data.last_name,
        email: res.data.email,
        phone: res.data.phone,
        specialization: res.data.specialization,
        dateOfBirth: res.data.date_of_birth
      };

      setProfile(updated);
      setFormData(updated);
      setIsEditing(false);

    } catch (err) {
      console.error(err);
      setError('Update failed.');
    }
  };


  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? dateString : d.toLocaleDateString();
  };


  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="profile-info">
            <h3>Doctor Profile</h3>

            {!isEditing ? (
              <div className="profile-details">
                <div className="profile-section">
                  <h4>Basic Information</h4>
                  <div className="info-group">
                    <p><strong>First Name:</strong> {profile.firstName}</p>
                    <p><strong>Last Name:</strong> {profile.lastName}</p>
                    <p><strong>Email:</strong> {profile.email}</p>
                    <p><strong>Phone:</strong> {profile.phone}</p>
                    <p><strong>Specialization:</strong> {profile.specialization}</p>
                    <p><strong>Date of Birth:</strong> {formatDate(profile.dateOfBirth)}</p>
                  </div>

                  <button 
                    className="edit-button"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="edit-form">
                <div className="form-group">
                  <label>First Name:</label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange}/>
                </div>

                <div className="form-group">
                  <label>Last Name:</label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange}/>
                </div>

                <div className="form-group">
                  <label>Email:</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange}/>
                </div>

                <div className="form-group">
                  <label>Phone:</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleInputChange}/>
                </div>

                <div className="form-group">
                  <label>Specialization:</label>
                  <input type="text" name="specialization" value={formData.specialization} onChange={handleInputChange}/>
                </div>

                <div className="form-group">
                  <label>Date of Birth:</label>
                  <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange}/>
                </div>

                <div className="button-group">
                  <button type="submit">Save Changes</button>
                  <button type="button" onClick={() => { setIsEditing(false); setFormData(profile); }}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        );

      case 'appointments':
        return <DoctorAppointments doctorId={doctorId || localStorage.getItem('doctorId')} />;

      case 'prescriptions':
        return <DoctorPrescriptions doctorId={doctorId || localStorage.getItem('doctorId')} />;

      case 'records':
        return <MedicalRecords doctorView={true} />;

      case 'cdss':
        return <CDSSModule doctorId={doctorId || localStorage.getItem('doctorId')} />;

      case 'dicom':
        return <DICOMViewer doctorId={doctorId || localStorage.getItem('doctorId')} />;

      case 'patients':
        return <DoctorPatients doctorId={doctorId || localStorage.getItem('doctorId')} />;
      

      default:
        return null;
    }
  };


  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>Doctor Dashboard</h2>

        <div className="tabs">
          <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>Profile</button>
          <button className={activeTab === 'appointments' ? 'active' : ''} onClick={() => setActiveTab('appointments')}>Appointments</button>
          <button className={activeTab === 'prescriptions' ? 'active' : ''} onClick={() => setActiveTab('prescriptions')}>Prescriptions</button>
          <button className={activeTab === 'records' ? 'active' : ''} onClick={() => setActiveTab('records')}>Medical Records</button>
          <button className={activeTab === 'cdss' ? 'active' : ''} onClick={() => setActiveTab('cdss')}>CDSS</button>
          <button className={activeTab === 'dicom' ? 'active' : ''} onClick={() => setActiveTab('dicom')}>DICOM Viewer</button>
          <button className={activeTab === 'patients' ? 'active' : ''} onClick={() => setActiveTab('patients')}>My Patients</button>

        </div>
      </nav>

      <main className="dashboard-content">

        {renderContent()}
      </main>
    </div>
  );
}

export default DoctorProfile;
