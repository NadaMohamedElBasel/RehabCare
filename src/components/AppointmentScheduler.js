// // src/components/AppointmentScheduler.js
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { useParams } from 'react-router-dom';
// import './AppointmentScheduler.css';

// function AppointmentScheduler() {
//   const { patientId } = useParams();
//   const [appointments, setAppointments] = useState([]);
//   const [formData, setFormData] = useState({ appointmentDate: '', purpose: '' });
//   const [error, setError] = useState('');

//   useEffect(() => {
//     fetchAppointments();
//   }, [patientId]);

//   const fetchAppointments = async () => {
//     try {
//       const response = await axios.get(`http://localhost:5000/api/appointments/${patientId}`);
//       setAppointments(response.data);
//     } catch (err) {
//       setError(err.response?.data?.error || 'Failed to fetch appointments');
//     }
//   };

//   const handleInputChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       await axios.post('http://localhost:5000/api/appointments', {
//         ...formData,
//         patientId
//       });
//       fetchAppointments();
//       setFormData({ appointmentDate: '', purpose: '' });
//     } catch (err) {
//       setError(err.response?.data?.error || 'Failed to schedule appointment');
//     }
//   };

//   return (
//     <div>
//       <h2>Schedule Appointment</h2>
//       <form onSubmit={handleSubmit}>
//         <input
//           type="datetime-local"
//           name="appointmentDate"
//           value={formData.appointmentDate}
//           onChange={handleInputChange}
//           required
//         />
//         <input
//           type="text"
//           name="purpose"
//           placeholder="Purpose"
//           value={formData.purpose}
//           onChange={handleInputChange}
//           required
//         />
//         <button type="submit">Schedule</button>
//       </form>
//       {error && <p style={{ color: 'red' }}>{error}</p>}
//       <h3>Your Appointments</h3>
//       <ul>
//         {appointments.map((appt) => (
//           <li key={appt.appointmentId}>
//             {appt.appointmentDate} - {appt.purpose} ({appt.status})
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// export default AppointmentScheduler;


import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './AppointmentScheduler.css';

function AppointmentScheduler() {
  const { patientId } = useParams();
  const [appointments, setAppointments] = useState([]);
  const [formData, setFormData] = useState({ appointmentDate: '', purpose: '', doctor: '',notes: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, [patientId]);

  const fetchAppointments = async () => {
    try {
      //const response = await axios.get(`http://localhost:5000/api/appointments/${patientId}`);
      const response = await axios.get(`http://127.0.0.1:5000/api/appointments/${patientId}`);
      setAppointments(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch appointments');
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      //await axios.post('http://localhost:5000/api/appointments', {
      await axios.post('http://127.0.0.1:5000/api/appointments', {
        ...formData,
        patientId
      });
      fetchAppointments();
      setFormData({ appointmentDate: '', purpose: '', doctor: '', notes: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to schedule appointment');
    }
  };

  return (
    <div>
      <h2>Schedule Appointment</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="datetime-local"
          name="appointmentDate"
          value={formData.appointmentDate}
          onChange={handleInputChange}
          required
        />
        <input
          type="text"
          name="purpose"
          placeholder="Purpose"
          value={formData.purpose}
          onChange={handleInputChange}
          required
        />
        <input
          type="text"
          name="doctor"
          placeholder="Doctor "
          value={formData.doctor}
          onChange={handleInputChange}
        />
        <button type="submit">Schedule</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <h3>Your Appointments</h3>
      <ul>
        {appointments.map((appt) => (
          <li key={appt.appointmentId || appt.appointment_id}>
            {appt.appointmentDate || appt.appointment_date} - {appt.purpose}

           
            
            {appt.doctor_id ? ` (Doctor ID: ${appt.doctor_id})` : ''}
            {appt.status ? ` (${appt.status})` : ''}
            {appt.notes ? ` — Notes: ${appt.notes}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AppointmentScheduler;