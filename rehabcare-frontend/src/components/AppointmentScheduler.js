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
  //const [appointments, setAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [pastAppointments, setPastAppointments] = useState([]);
  const [formData, setFormData] = useState({ appointmentDate: '',appointmentTime: '', purpose: '', doctor: '',notes: '' });
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, [patientId]);

  const fetchAppointments = async () => {
    try {
      //const response = await axios.get(`http://localhost:5000/api/appointments/${patientId}`);
      const response = await axios.get(`http://127.0.0.1:5000/api/appointments/${patientId}`);
      categorizeAppointments(response.data);
      //setAppointments(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch appointments');
    }
  };


// const categorizeAppointments = (appts) => {
//   const now = new Date();
//   const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
 
//   console.log('Current date for comparison (start of day):', today);
 
//   const upcoming = [];
//   const past = [];
  
//   appts.forEach(appt => {
//     try {
//       // Parse the RFC 2822 date format from backend
//       const apptDate = new Date(appt.appointment_date);
      
//       // Create date object at midnight in local timezone
//       const apptDateOnly = new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate());
     
//       console.log(`Appointment ${appt.appointment_id}:`, {
//         date: appt.appointment_date,
//         time: appt.appointment_time,
//         parsedDate: apptDateOnly,
//         today: today,
//         apptTime: apptDateOnly.getTime(),
//         todayTime: today.getTime(),
//         difference: apptDateOnly.getTime() - today.getTime(),
//         isUpcoming: apptDateOnly >= today,
//         status: appt.status
//       });
     
//       // Compare DATE ONLY
//       if (apptDateOnly >= today && appt.status !== 'cancelled') {
//         upcoming.push(appt);
//       } else if (appt.status !== 'cancelled') {
//         past.push(appt);
//       }
//     } catch (error) {
//       console.error('Error parsing appointment date:', error, appt);
//     }
//   });
  
//   // Sort upcoming by date ascending
//   upcoming.sort((a, b) => {
//     const dateA = new Date(a.appointment_date);
//     const dateB = new Date(b.appointment_date);
//     return dateA - dateB;
//   });
  
//   // Sort past by date descending
//   past.sort((a, b) => {
//     const dateA = new Date(a.appointment_date);
//     const dateB = new Date(b.appointment_date);
//     return dateB - dateA;
//   });
  
//   console.log('Categorized appointments - Upcoming:', upcoming.length, 'Past:', past.length);
 
//   setUpcomingAppointments(upcoming);
//   setPastAppointments(past);
// };

// const categorizeAppointments = (appts) => {
//   const now = new Date();
//   const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
 
//   console.log('Current date for comparison (start of day):', today);
 
//   const upcoming = [];
//   const past = [];
  
//   appts.forEach(appt => {
//     try {
//       // Parse the RFC 2822 / ISO date format from backend
//       const apptDate = new Date(appt.appointment_date);
      
//       // Create date object at midnight in local timezone
//       const apptDateOnly = new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate());
     
//       console.log(`Appointment ${appt.appointment_id}:`, {
//         date: appt.appointment_date,
//         time: appt.appointment_time,
//         parsedDate: apptDateOnly,
//         today: today,
//         apptTime: apptDateOnly.getTime(),
//         todayTime: today.getTime(),
//         difference: apptDateOnly.getTime() - today.getTime(),
//         isUpcoming: apptDateOnly >= today,
//         status: appt.status
//       });
     
//       // Include ALL appointments (don't drop cancelled). Place by date only.
//       if (apptDateOnly >= today) {
//         upcoming.push(appt);
//       } else {
//         past.push(appt);
//       }
//     } catch (error) {
//       console.error('Error parsing appointment date:', error, appt);
//     }
//   });
  
//   // Sort upcoming by date ascending
//   upcoming.sort((a, b) => {
//     const dateA = new Date(a.appointment_date);
//     const dateB = new Date(b.appointment_date);
//     return dateA - dateB;
//   });
  
//   // Sort past by date descending
//   past.sort((a, b) => {
//     const dateA = new Date(a.appointment_date);
//     const dateB = new Date(b.appointment_date);
//     return dateB - dateA;
//   });
  
//   // Ensure past appointments do not show "scheduled" — treat scheduled past as completed
//   const normalizedPast = past.map(a => {
//     const copy = { ...a };
//     if (!copy.status || copy.status.toLowerCase() === 'scheduled') {
//       copy.status = 'completed';
//     }
//     return copy;
//   });

//   console.log('Categorized appointments - Upcoming:', upcoming.length, 'Past:', normalizedPast.length);
 
//   setUpcomingAppointments(upcoming);
//   setPastAppointments(normalizedPast);
// };

const categorizeAppointments = (appts) => {
  const now = new Date(); // Current date and time
 
  console.log('Current date and time for comparison:', now);
 
  const upcoming = [];
  const past = [];
  
  appts.forEach(appt => {
    try {
      // Parse the date
      const apptDate = new Date(appt.appointment_date);
      
      // If there's a time, combine date + time for accurate comparison
      let apptDateTime;
      if (appt.appointment_time) {
        // Parse time (format: "HH:MM:SS")
        const [hours, minutes, seconds] = appt.appointment_time.split(':').map(num => parseInt(num, 10));
        apptDateTime = new Date(
          apptDate.getFullYear(),
          apptDate.getMonth(),
          apptDate.getDate(),
          hours,
          minutes,
          seconds || 0
        );
      } else {
        // No time specified, use end of day (23:59:59) so it stays upcoming all day
        apptDateTime = new Date(
          apptDate.getFullYear(),
          apptDate.getMonth(),
          apptDate.getDate(),
          23,
          59,
          59
        );
      }
     
      console.log(`Appointment ${appt.appointment_id}:`, {
        date: appt.appointment_date,
        time: appt.appointment_time,
        parsedDateTime: apptDateTime,
        now: now,
        apptTime: apptDateTime.getTime(),
        nowTime: now.getTime(),
        difference: apptDateTime.getTime() - now.getTime(),
        isUpcoming: apptDateTime >= now,
        status: appt.status
      });
     
      // Compare full date + time
      if (apptDateTime >= now) {
        upcoming.push(appt);
      } else {
        past.push(appt);
      }
    } catch (error) {
      console.error('Error parsing appointment date:', error, appt);
    }
  });
  
  // Sort upcoming by date+time ascending
  upcoming.sort((a, b) => {
    const dateA = new Date(a.appointment_date);
    const timeA = a.appointment_time ? a.appointment_time.split(':').map(n => parseInt(n, 10)) : [23, 59, 59];
    const dtA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate(), timeA[0], timeA[1], timeA[2] || 0);
    
    const dateB = new Date(b.appointment_date);
    const timeB = b.appointment_time ? b.appointment_time.split(':').map(n => parseInt(n, 10)) : [23, 59, 59];
    const dtB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate(), timeB[0], timeB[1], timeB[2] || 0);
    
    return dtA - dtB;
  });
  
  // Sort past by date+time descending
  past.sort((a, b) => {
    const dateA = new Date(a.appointment_date);
    const timeA = a.appointment_time ? a.appointment_time.split(':').map(n => parseInt(n, 10)) : [23, 59, 59];
    const dtA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate(), timeA[0], timeA[1], timeA[2] || 0);
    
    const dateB = new Date(b.appointment_date);
    const timeB = b.appointment_time ? b.appointment_time.split(':').map(n => parseInt(n, 10)) : [23, 59, 59];
    const dtB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate(), timeB[0], timeB[1], timeB[2] || 0);
    
    return dtB - dtA;
  });

  console.log('Categorized appointments - Upcoming:', upcoming.length, 'Past:', past.length);
 
  setUpcomingAppointments(upcoming);
  setPastAppointments(past);
};



  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditInputChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      //await axios.post('http://localhost:5000/api/appointments', {
      await axios.post('http://127.0.0.1:5000/api/appointments', {
        // ...formData,
        // patientId
        patientId,
      appointmentDate: formData.appointmentDate,
      appointmentTime: formData.appointmentTime,  // ENSURE THIS IS SENT
      purpose: formData.purpose,
      doctorId: formData.doctor,  // or use a separate field
      notes: formData.notes
      });
      setSuccess('Appointment scheduled successfully!');
      fetchAppointments();
      setTimeout(() => setSuccess(''), 3000);
      setFormData({ appointmentDate: '',appointmentTime: '', purpose: '', doctor: '', notes: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to schedule appointment');
    }
  };

  const handleEditClick = (appointment) => {
    setEditingId(appointment.appointment_id);
    setEditFormData({
      appointmentDate: appointment.appointment_date,
      appointmentTime: appointment.appointment_time || '',
      purpose: appointment.purpose,
      doctor_id: appointment.doctor_id || '',
      notes: appointment.notes || ''
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await axios.put(`http://127.0.0.1:5000/api/appointments/${editingId}`, {
        appointmentDate: editFormData.appointmentDate,
        appointmentTime: editFormData.appointmentTime,
        purpose: editFormData.purpose,
        doctor_id: editFormData.doctor_id,
        notes: editFormData.notes
      });
      setSuccess('Appointment updated successfully!');
      setEditingId(null);
      fetchAppointments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to update appointment', err);
      setError(err.response?.data?.error || 'Failed to update appointment');
    }
  };

  const handleCancel = async (appointmentId) => {
    
    try {
      setError('');
      await axios.put(`http://127.0.0.1:5000/api/appointments/${appointmentId}/cancel`);
      setSuccess('Appointment cancelled successfully!');
      fetchAppointments();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to cancel appointment', err);
      setError(err.response?.data?.error || 'Failed to cancel appointment');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const formatDateTime = (date, time) => {
    const d = new Date(date);
    const formatted = d.toLocaleDateString() + (time ? ` at ${time}` : '');
    return formatted;
  };

  return (
    // <div>
    //   <h2>Schedule Appointment</h2>
    //   <form onSubmit={handleSubmit}>
    //     <input
    //       type="datetime-local"
    //       name="appointmentDate"
    //       value={formData.appointmentDate}
    //       onChange={handleInputChange}
    //       required
    //     />
    //     <input
    //       type="text"
    //       name="purpose"
    //       placeholder="Purpose"
    //       value={formData.purpose}
    //       onChange={handleInputChange}
    //       required
    //     />
    //     <input
    //       type="text"
    //       name="doctor"
    //       placeholder="Doctor "
    //       value={formData.doctor}
    //       onChange={handleInputChange}
    //     />
    //     <button type="submit">Schedule</button>
    //   </form>
    //   {error && <p style={{ color: 'red' }}>{error}</p>}
    //   <h3>Your Appointments</h3>
    //   <ul>
    //     {appointments.map((appt) => (
    //       <li key={appt.appointmentId || appt.appointment_id}>
    //         {appt.appointmentDate || appt.appointment_date} - {appt.purpose}

           
            
    //         {appt.doctor_id ? ` (Doctor ID: ${appt.doctor_id})` : ''}
    //         {appt.status ? ` (${appt.status})` : ''}
    //         {appt.notes ? ` — Notes: ${appt.notes}` : ''}
    //       </li>
    //     ))}
    //   </ul>
    // </div>
    <div className="appointment-scheduler-container">
      <h2>Appointment Scheduling</h2>

      {/* Schedule New Appointment Form */}
      <section className="schedule-form-section">
        <h3>Schedule New Appointment</h3>
        <form onSubmit={handleSubmit} className="appointment-form">
          <div className="form-group">
            <label>Date:</label>
            <input
              type="date"
              name="appointmentDate"
              value={formData.appointmentDate}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Time:</label>
            <input
              type="time"
              name="appointmentTime"
              value={formData.appointmentTime}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Purpose:</label>
            <input
              type="text"
              name="purpose"
              placeholder="e.g., Physical Therapy, Checkup"
              value={formData.purpose}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Doctor ID :</label>
            <input
              type="number"
              name="doctor"
              placeholder="Doctor ID"
              value={formData.doctor}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Notes (optional):</label>
            <textarea
              name="notes"
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
            />
          </div>
          <button type="submit" className="btn-primary">Schedule Appointment</button>
        </form>
      </section>

      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}

      {/* Upcoming Appointments */}
      <section className="appointments-section">
        <h3>Upcoming Appointments</h3>
        {upcomingAppointments.length === 0 ? (
          <p className="no-appointments">No upcoming appointments.</p>
        ) : (
          <div className="appointments-list">
            {upcomingAppointments.map((appt) => (
  <div key={appt.appointment_id} className="appointment-card upcoming">
    {editingId === appt.appointment_id ? (
      <form onSubmit={handleEditSubmit} className="edit-form">
        <div className="form-group">
          <label>Date:</label>
          <input
            type="date"
            name="appointmentDate"
            value={editFormData.appointmentDate}
            onChange={handleEditInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Time:</label>
          <input
            type="time"
            name="appointmentTime"
            value={editFormData.appointmentTime}
            onChange={handleEditInputChange}
          />
        </div>
        <div className="form-group">
          <label>Purpose:</label>
          <input
            type="text"
            name="purpose"
            value={editFormData.purpose}
            onChange={handleEditInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Doctor ID:</label>
          <input
            type="number"
            name="doctor_id"
            value={editFormData.doctor_id}
            onChange={handleEditInputChange}
          />
        </div>
        <div className="form-group">
          <label>Notes:</label>
          <textarea
            name="notes"
            value={editFormData.notes}
            onChange={handleEditInputChange}
            rows="2"
          />
        </div>
        <div className="button-group">
          <button type="submit" className="btn-save">Save Changes</button>
          <button type="button" className="btn-cancel-edit" onClick={handleCancelEdit}>Cancel</button>
        </div>
      </form>
    ) : (
      <>
        <div className="appointment-header">
          <h4>{appt.purpose}</h4>
          {/* dynamic badge class based on status */}
          <span
            className={`status-badge ${
              (appt.status || '').toLowerCase() === 'cancelled' ? 'cancelled' :
              (appt.status || '').toLowerCase() === 'completed' ? 'completed' : 'scheduled'
            }`}
          >
            {appt.status || 'scheduled'}
          </span>
        </div>
        <div className="appointment-details">
          <p><strong>Date & Time:</strong> {formatDateTime(appt.appointment_date, appt.appointment_time)}</p>
          {appt.doctor_id && <p><strong>Doctor ID:</strong> {appt.doctor_id}</p>}
          {appt.notes && <p><strong>Notes:</strong> {appt.notes}</p>}
        </div>

        {/* hide Edit / Cancel if already cancelled */}
        { (appt.status || '').toLowerCase() !== 'cancelled' ? (
          <div className="button-group">
            <button
              className="btn-edit"
              onClick={() => handleEditClick(appt)}
            >
              Edit
            </button>
            <button
              className="btn-delete"
              onClick={() => handleCancel(appt.appointment_id)}
            >
              Cancel
            </button>
          </div>
        ) : null }
      </>
    )}
  </div>
))}
          </div>
        )}
      </section>

      {/* Past Appointments */}
      <section className="appointments-section">
        <h3>Past Appointments</h3>
        {pastAppointments.length === 0 ? (
          <p className="no-appointments">No past appointments.</p>
        ) : (
          <div className="appointments-list">
            {pastAppointments.map((appt) => (
              <div key={appt.appointment_id} className="appointment-card past">
                <div className="appointment-header">
                  <h4>{appt.purpose}</h4>

                  <span
                    className={`status-badge ${
                      (appt.status || '').toLowerCase() === 'cancelled'
                        ? 'cancelled'
                        : 'completed'
                    }`}
                  >
                    {appt.status || 'completed'}
                  </span>
                  
                </div>
                <div className="appointment-details">
                  <p><strong>Date & Time:</strong> {formatDateTime(appt.appointment_date, appt.appointment_time)}</p>
                  {appt.doctor_id && <p><strong>Doctor ID:</strong> {appt.doctor_id}</p>}
                  {appt.notes && <p><strong>Notes:</strong> {appt.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AppointmentScheduler;