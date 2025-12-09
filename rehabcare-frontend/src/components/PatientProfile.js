// // src/components/PatientProfile.js
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { useParams } from 'react-router-dom';
// import './PatientProfile.css';
// import AppointmentScheduler from './AppointmentScheduler';
// import MedicalRecords from './MedicalRecords';
// import Prescriptions from './Prescriptions';
// import Billing from './Billing';

// function PatientProfile() {
//   const [activeTab, setActiveTab] = useState('profile');
//   const { patientId } = useParams();
//   const [profile, setProfile] = useState({
//     firstName: '',
//     lastName: '',
//     email: '',
//     dateOfBirth: '',
//     // New fields that will be added to database
//     phoneNumber: '',
//     address: '',
//     emergencyContact: '',
//     bloodType: ''
//   });
//   const [isEditing, setIsEditing] = useState(false);
//   const [formData, setFormData] = useState({});
//   const [error, setError] = useState('');

//   // useEffect(() => {
//   //   fetchProfile();
//   // }, [patientId]);

//   // const fetchProfile = async () => {
//   //   try {
//   //     const response = await axios.get(`http://localhost:5000/api/patients/${patientId}`);
//   //     setProfile(response.data);
//   //     setFormData(response.data);
//   //   } catch (err) {
//   //     setError(err.response?.data?.error || 'Failed to fetch profile');
//   //   }
//   // };

//   // const handleInputChange = (e) => {
//   //   setFormData({ ...formData, [e.target.name]: e.target.value });
//   // };

//   // const handleSubmit = async (e) => {
//   //   e.preventDefault();
//   //   try {
//   //     await axios.put(`http://localhost:5000/api/patients/${patientId}`, formData);
//   //     setProfile(formData);
//   //     setError('');
//   //   } catch (err) {
//   //     setError(err.response?.data?.error || 'Update failed');
//   //   }
//   // };

//   // return (
//   //   <div>
//   //     <h2>Patient Profile</h2>
//   //     <form onSubmit={handleSubmit}>
//   //       <input
//   //         type="text"
//   //         name="firstName"
//   //         value={formData.firstName || ''}
//   //         onChange={handleInputChange}
//   //       />
//   //       <input
//   //         type="text"
//   //         name="lastName"
//   //         value={formData.lastName || ''}
//   //         onChange={handleInputChange}
//   //       />
//   //       <input
//   //         type="email"
//   //         name="email"
//   //         value={formData.email || ''}
//   //         onChange={handleInputChange}
//   //       />
//   //       <input
//   //         type="date"
//   //         name="dateOfBirth"
//   //         value={formData.dateOfBirth || ''}
//   //         onChange={handleInputChange}
//   //       />
//   //       <button type="submit">Update Profile</button>
//   //     </form>
//   //     {error && <p style={{ color: 'red' }}>{error}</p>}
//   //   </div>
//   // );
//   useEffect(() => {
//     const fetchPatientData = async () => {
//       try {
//         // Get patientId from params or localStorage
//         const currentPatientId = patientId || localStorage.getItem('patientId');
//         console.log('Current Patient ID:', currentPatientId); // Debug log
        
//         if (!currentPatientId) {
//           console.error('No patient ID found');
//           return;
//         }
//         const response = await axios.get(`http://localhost:5000/api/patients/${currentPatientId}`);
//         console.log('Raw server response:', response.data);

//         // Map backend field names to frontend field names
//       const profileData = {
//         firstName: response.data.first_name,  // Changed from firstName
//         lastName: response.data.last_name,    // Changed from lastName
//         email: response.data.email,
//         dateOfBirth: response.data.date_of_birth ? 
//           new Date(response.data.date_of_birth).toISOString().split('T')[0] : ''
//       };

//       console.log('Mapped profile data:', profileData); // Debug log
//         setProfile(profileData);
//         setFormData(profileData);
//       } catch (error) {
//         console.error('Error fetching patient data:', error);
//       }
//     };
//     fetchPatientData();
//   }, [patientId]);

  

//   // Update the date display in the render section
// const formatDate = (dateString) => {
//   if (!dateString) return '';
//   try {
//     const date = new Date(dateString);
//     if (isNaN(date.getTime())) return ''; // Invalid date
//     return date.toLocaleDateString();
//   } catch (error) {
//     return '';
//   }
// };

//   const handleInputChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       await axios.put(`http://localhost:5000/api/patients/${patientId}`, formData);
//       setProfile(formData);
//       setIsEditing(false);
//     } catch (error) {
//       console.error('Error updating profile:', error);
//     }
//   };

//   const renderContent = () => {
//     switch(activeTab) {
//       case 'profile':
//         return (
//           <div className="profile-info">
//             <h3>Profile Information</h3>
//             {!isEditing ? (
//               <div className="profile-details">
//                 <div className="profile-section">
//                   <h4>Basic Information</h4>
//                   <div className="info-group">
//                     <p><strong>First Name:</strong> {profile.firstName}</p>
//                     <p><strong>Last Name:</strong> {profile.lastName}</p>
//                     <p><strong>Email:</strong> {profile.email}</p>
//                     <p><strong>Date of Birth:</strong> {formatDate(profile.dateOfBirth) || 'Not provided'}</p>
//                   </div>
//                   <button 
//                     className="edit-button"
//                     onClick={() => setIsEditing(true)}
//                   >
//                     Edit Profile
//                   </button>
//                 </div>
//               </div>
//             ) : (
//               <form onSubmit={handleSubmit} className="edit-form">
//                 <div className="form-group">
//                   <label>First Name:</label>
//                   <input
//                     type="text"
//                     name="firstName"
//                     value={formData.firstName || ''}
//                     onChange={handleInputChange}
//                   />
//                 </div>
//                 <div className="form-group">
//                   <label>Last Name:</label>
//                   <input
//                     type="text"
//                     name="lastName"
//                     value={formData.lastName || ''}
//                     onChange={handleInputChange}
//                   />
//                 </div>
//                 <div className="form-group">
//                   <label>Email:</label>
//                   <input
//                     type="email"
//                     name="email"
//                     value={formData.email || ''}
//                     onChange={handleInputChange}
//                   />
//                 </div>
//                 <div className="form-group">
//                   <label>Date of Birth:</label>
//                   <input
//                     type="date"
//                     name="dateOfBirth"
//                     value={formData.dateOfBirth || ''}
//                     onChange={handleInputChange}
//                   />
//                 </div>
//                 <div className="button-group">
//                   <button type="submit">Save Changes</button>
//                   <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
//                 </div>
//               </form>
//             )}
//           </div>
//         );
//       case 'appointments':
//         return <AppointmentScheduler />;
//       case 'records':
//         return <MedicalRecords />;
//       case 'prescriptions':
//         return <Prescriptions />;
//       case 'billing':
//         return <Billing />;
//       default:
//         return (
//           <div className="profile-info">
//             <h3>Profile Information</h3>
//             {/* Profile form/information here */}
//           </div>
//         );
//     }
//   };

//   return (
//     <div className="dashboard-container">
//       <nav className="dashboard-nav">
//         <h2>Patient Dashboard</h2>
//         <div className="tabs">
//           <button 
//             className={activeTab === 'profile' ? 'active' : ''} 
//             onClick={() => setActiveTab('profile')}>
//             Profile
//           </button>
//           <button 
//             className={activeTab === 'appointments' ? 'active' : ''} 
//             onClick={() => setActiveTab('appointments')}>
//             Appointments
//           </button>
//           <button 
//             className={activeTab === 'records' ? 'active' : ''} 
//             onClick={() => setActiveTab('records')}>
//             Medical Records
//           </button>
//           <button 
//             className={activeTab === 'prescriptions' ? 'active' : ''} 
//             onClick={() => setActiveTab('prescriptions')}>
//             Prescriptions
//           </button>
//           <button 
//             className={activeTab === 'billing' ? 'active' : ''} 
//             onClick={() => setActiveTab('billing')}>
//             Billing
//           </button>
//         </div>
//       </nav>
//       <main className="dashboard-content">
//         {renderContent()}
//       </main>
//     </div>
//   );
// }

// export default PatientProfile;





import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import AppointmentScheduler from './AppointmentScheduler.js';
import MedicalRecords from './MedicalRecords.js';
import Prescriptions from './Prescriptions.js';
import Billing from './Billing.js';
import './PatientProfile.css';


function PatientProfile() {
  const [activeTab, setActiveTab] = useState('profile');
  const { patientId } = useParams();
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    phoneNumber: '',
    gender: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const id = patientId || localStorage.getItem('patientId');
        if (!id) return;
        const res = await axios.get(`http://localhost:5000/api/patients/${id}`);
        const data = res.data || {};
        // Map snake_case from server to camelCase used in UI
        const mapped = {
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          email: data.email || '',
          dateOfBirth: data.date_of_birth || '',
          phoneNumber: data.phone_number || '',
          gender: data.gender || ''
        };
        setProfile(mapped);
        setFormData(mapped);
      } catch (err) {
        console.error('Fetch profile error', err);
        setError('Failed to load profile');
      }
    };
    fetchProfile();
  }, [patientId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Save changes -> PUT to backend and update UI
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const id = patientId || localStorage.getItem('patientId');
      if (!id) {
        setError('No patient id available.');
        return;
      }

      // Build payload in snake_case (backend expects first_name,last_name,email,date_of_birth)
      const payload = {
        first_name: formData.firstName ?? profile.firstName,
        last_name: formData.lastName ?? profile.lastName,
        email: formData.email ?? profile.email,
        date_of_birth: formData.dateOfBirth ?? profile.dateOfBirth ?? null,
        phone_number: formData.phoneNumber ?? profile.phoneNumber ?? null,
        gender: formData.gender ?? profile.gender ?? null
      };

      const res = await axios.put(`http://localhost:5000/api/patients/${id}`, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      const returned = res.data || {};
      const updated = {
        firstName: returned.first_name ?? payload.first_name,
        lastName: returned.last_name ?? payload.last_name,
        email: returned.email ?? payload.email,
        dateOfBirth: returned.date_of_birth ?? payload.date_of_birth,
        phoneNumber: returned.phone_number ?? payload.phone_number,
        gender: returned.gender ?? payload.gender
      };

      setProfile(updated);
      setFormData(updated);
      setIsEditing(false);
      setError('');
    } catch (err) {
      console.error('Update profile error', err);
      setError(err.response?.data?.error || 'Update failed');
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
            <h3>Profile Information</h3>
            {!isEditing ? (
              <div className="profile-details">
                <div className="profile-section">
                  <h4>Basic Information</h4>
                  <div className="info-group">
                    <p><strong>First Name:</strong> {profile.firstName || 'Not provided'}</p>
                    <p><strong>Last Name:</strong> {profile.lastName || 'Not provided'}</p>
                    <p><strong>Email:</strong> {profile.email || 'Not provided'}</p>
                    <p><strong>Date of Birth:</strong> {formatDate(profile.dateOfBirth)}</p>
                    <p><strong>Phone Number:</strong> {profile.phoneNumber || 'Not provided'}</p>
                    <p><strong>Gender:</strong> {profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'Not provided'}</p>
                  </div>
                  <button className="edit-button" onClick={() => setIsEditing(true)}>Edit Profile</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="edit-form">
                <div className="form-group">
                  <label>First Name:</label>
                  <input type="text" name="firstName" value={formData.firstName || ''} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Last Name:</label>
                  <input type="text" name="lastName" value={formData.lastName || ''} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Email:</label>
                  <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Date of Birth:</label>
                  <input type="date" name="dateOfBirth" value={formData.dateOfBirth || ''} onChange={handleInputChange} />
                </div>

                <div className="form-group">
                  <label>Phone Number:</label>
                  <input 
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber || ''}
                    onChange={handleInputChange}
                    pattern="[0-9]+"
                  />
                </div>

                <div className="form-group">
                  <label>Gender:</label>
                  <select
                    name="gender"
                    value={formData.gender || ''}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    
                  </select>
                </div>


                <div className="button-group">
                  <button type="submit">Save Changes</button>
                  <button type="button" onClick={() => { setIsEditing(false); setFormData(profile); }}>Cancel</button>
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
              </form>
            )}
          </div>
        );
      case 'appointments':
        return <AppointmentScheduler />;
      case 'records':
        return <MedicalRecords />;
        return <MedicalRecords patientId={patientId || localStorage.getItem('patientId')} />;
      case 'prescriptions':
        return <Prescriptions />;
        return <Prescriptions patientId={patientId || localStorage.getItem('patientId')} />;
      case 'billing':
        return <Billing />;
        return <Billing patientId={patientId || localStorage.getItem('patientId')} />;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>Patient Dashboard</h2>
        <div className="tabs">
          <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>Profile</button>
          <button className={activeTab === 'appointments' ? 'active' : ''} onClick={() => setActiveTab('appointments')}>Appointments</button>
          <button className={activeTab === 'records' ? 'active' : ''} onClick={() => setActiveTab('records')}>Medical Records</button>
          <button className={activeTab === 'prescriptions' ? 'active' : ''} onClick={() => setActiveTab('prescriptions')}>Prescriptions</button>
          <button className={activeTab === 'billing' ? 'active' : ''} onClick={() => setActiveTab('billing')}>Billing</button>
        </div>
      </nav>
      <main className="dashboard-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default PatientProfile;