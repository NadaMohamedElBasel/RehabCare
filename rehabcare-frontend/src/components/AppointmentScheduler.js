import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './AppointmentScheduler.css';

// 🎯 NEW UTILITY FUNCTION: Generates 1-hour time slots
const generateTimeSlots = (startHour = 9, endHour = 17) => {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    const start = String(hour).padStart(2, '0') + ':00';
    const end = String(hour + 1).padStart(2, '0') + ':00';
    slots.push({
      start: start,
      display: `${start} - ${end}`,
    });
  }
  return slots;
};

// Define the available time slots for the selector (9am to 5pm)
const AVAILABLE_SLOTS = generateTimeSlots(9, 17);


function AppointmentScheduler() {
  const { patientId } = useParams();
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [pastAppointments, setPastAppointments] = useState([]);
  const [formData, setFormData] = useState({ appointmentDate: '',appointmentTime: '', purpose: '', doctor: '',notes: '' });
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [patientId]);

  const fetchAppointments = async () => {
    setIsLoading(true); // Start loading
    try {
      const response = await axios.get(`http://127.0.0.1:5000/api/appointments/${patientId}`);
      categorizeAppointments(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch appointments');
    } finally {
      setIsLoading(false); // Stop loading
    }
  };


const categorizeAppointments = (appts) => {
  const now = new Date();

  const upcoming = [];
  const past = [];

  appts.forEach(appt => {
    try {
      const apptDate = new Date(appt.appointment_date);
      let apptDateTime;
      if (appt.appointment_time) {
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
        apptDateTime = new Date(
          apptDate.getFullYear(),
          apptDate.getMonth(),
          apptDate.getDate(),
          23,
          59,
          59
        );
      }

      if (apptDateTime >= now) {
        upcoming.push(appt);
      } else {
        past.push(appt);
      }
    } catch (error) {
      console.error('Error parsing appointment date:', error, appt);
    }
  });

  // Sorting logic remains the same
  upcoming.sort((a, b) => {
    const dateA = new Date(a.appointment_date);
    const timeA = a.appointment_time ? a.appointment_time.split(':').map(n => parseInt(n, 10)) : [23, 59, 59];
    const dtA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate(), timeA[0], timeA[1], timeA[2] || 0);

    const dateB = new Date(b.appointment_date);
    const timeB = b.appointment_time ? b.appointment_time.split(':').map(n => parseInt(n, 10)) : [23, 59, 59];
    const dtB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate(), timeB[0], timeB[1], timeB[2] || 0);

    return dtA - dtB;
  });

  past.sort((a, b) => {
    const dateA = new Date(a.appointment_date);
    const timeA = a.appointment_time ? a.appointment_time.split(':').map(n => parseInt(n, 10)) : [23, 59, 59];
    const dtA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate(), timeA[0], timeA[1], timeA[2] || 0);

    const dateB = new Date(b.appointment_date);
    const timeB = b.appointment_time ? b.appointment_time.split(':').map(n => parseInt(n, 10)) : [23, 59, 59];
    const dtB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate(), timeB[0], timeB[1], timeB[2] || 0);

    return dtB - dtA;
  });

  setUpcomingAppointments(upcoming);
  setPastAppointments(past);
};

  // Utility function to calculate the end time (remains the same)
  const calculateEndTime = (startTime) => {
    if (!startTime) return '';
    try {
      let [hours, minutes] = startTime.split(':').map(Number);

      hours = hours + 1;

      if (hours >= 24) {
        hours = hours % 24;
      }

      const endHours = String(hours).padStart(2, '0');
      const endMinutes = String(minutes).padStart(2, '0');

      return `${endHours}:${endMinutes}`;
    } catch (e) {
      return '';
    }
  };

  // 🎯 NEW CLICK HANDLER for the slot buttons (for creation form)
  const handleSlotSelection = (slotStartTime) => {
    setFormData({ ...formData, appointmentTime: slotStartTime });
  };

  // 🎯 NEW CLICK HANDLER for the slot buttons (for edit form)
  const handleEditSlotSelection = (slotStartTime) => {
    setEditFormData({ ...editFormData, appointmentTime: slotStartTime });
  };


  // Original handlers are kept but the input type changed from <select> to <div> of <button>s.
  // We keep these names for variable integrity as requested.
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditInputChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.appointmentTime) {
        setError('Please select a time slot.');
        return;
    }
    // Clear previous error
    setError('');

    try {
      await axios.post('http://127.0.0.1:5000/api/appointments', {
        patientId,
      appointmentDate: formData.appointmentDate,
      appointmentTime: formData.appointmentTime,
      purpose: formData.purpose,
      doctorId: formData.doctor,
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
      appointmentTime: appointment.appointment_time ? appointment.appointment_time.substring(0, 5) : '', // Ensure time is HH:MM for selection
      purpose: appointment.purpose,
      doctor_id: appointment.doctor_id || '',
      notes: appointment.notes || ''
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.appointmentTime) {
        setError('Please select a time slot.');
        return;
    }

    try {
      setError('');
      await axios.put(`http://127.0.0.1:5000/api/appointments/${editingId}`, {
        appointmentDate: editFormData.appointmentDate,
        // Ensure only HH:MM:SS is sent, or just HH:MM if that's all the backend expects
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
    // ... cancellation logic (unchanged)
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

  if (isLoading) {
      return <div className="appointment-scheduler-container"><h2>Loading Appointments...</h2><p>Please wait while we fetch your schedule.</p></div>;
  }

  return (
    <div className="appointment-scheduler-container">
      <h2>Appointment Scheduling</h2>

      {/* Schedule New Appointment Form */}
      <section className="schedule-form-section">
        <h3>Schedule New Appointment (1-Hour Slots)</h3>
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

          {/* 🎯 UI CHANGE: Slot Selector Buttons */}
          <div className="form-group slot-selector">
            <label>Select Time Slot:</label>
            <div className="slot-buttons-container">
              {AVAILABLE_SLOTS.map(slot => (
                  <button
                      key={slot.start}
                      type="button" // Important: prevents form submission
                      className={`slot-button ${formData.appointmentTime === slot.start ? 'selected' : ''}`}
                      onClick={() => handleSlotSelection(slot.start)}
                  >
                      {slot.display}
                  </button>
              ))}
            </div>
            {/* Added a hidden input to make the required constraint work visually (optional) */}
            <input
                type="hidden"
                name="appointmentTime"
                value={formData.appointmentTime}
                required
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

        {/* 🎯 UI CHANGE: Edit Slot Selector Buttons */}
        <div className="form-group slot-selector">
            <label>Select Time Slot:</label>
            <div className="slot-buttons-container">
                {AVAILABLE_SLOTS.map(slot => (
                    <button
                        key={slot.start}
                        type="button" // Important: prevents form submission
                        className={`slot-button ${editFormData.appointmentTime === slot.start ? 'selected' : ''}`}
                        onClick={() => handleEditSlotSelection(slot.start)}
                    >
                        {slot.display}
                    </button>
                ))}
            </div>
            <input
                type="hidden"
                name="appointmentTime"
                value={editFormData.appointmentTime}
                required
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
          {/* Display as a time range using the stored start time */}
          <p>
            <strong>Time Slot:</strong> {appt.appointment_time ?
            `${appt.appointment_time.substring(0, 5)} - ${calculateEndTime(appt.appointment_time)}`
            : 'All Day'}
          </p>
          <p><strong>Date:</strong> {new Date(appt.appointment_date).toLocaleDateString()}</p>

          {appt.doctor_id && <p><strong>Doctor ID:</strong> {appt.doctor_id}</p>}
          {appt.notes && <p><strong>Notes:</strong> {appt.notes}</p>}
        </div>

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
                  {/* Display as a time range using the stored start time */}
                  <p>
                    <strong>Time Slot:</strong> {appt.appointment_time ?
                    `${appt.appointment_time.substring(0, 5)} - ${calculateEndTime(appt.appointment_time)}`
                    : 'All Day'}
                  </p>
                  <p><strong>Date:</strong> {new Date(appt.appointment_date).toLocaleDateString()}</p>

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

