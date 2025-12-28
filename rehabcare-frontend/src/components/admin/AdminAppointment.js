// src/components/StaffAppointmentManager.js

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './AdminAppointment.css';

// Configuration: Clinic hours and slot duration (must match backend)
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 17;
const SLOT_DURATION_MINUTES = 60;

const API = "http://localhost:5000";

const ICD10_CODES = [
  // --- MUSCULOSKELETAL & ORTHOPEDIC ---
  { code: 'M54.5', description: 'Low back pain (Lumbalgia)' },
  { code: 'M54.2', description: 'Cervicalgia (Neck pain)' },
  { code: 'M54.41', description: 'Lumbago with sciatica, right side' },
  { code: 'M25.511', description: 'Pain in right shoulder joint' },
  { code: 'M25.561', description: 'Pain in right knee' },
  { code: 'M75.10', description: 'Unspecified rotator cuff tear/rupture, unspecified shoulder' },
  { code: 'M76.60', description: 'Achilles tendinitis, unspecified leg' },
  { code: 'S93.409A', description: 'Unspecified sprain of ankle, initial encounter' },

  // --- NEUROLOGICAL ---
  { code: 'I69.351', description: 'Hemiplegia/hemiparesis following cerebral infarction (Stroke)' },
  { code: 'G35', description: 'Multiple sclerosis' },
  { code: 'G20', description: 'Parkinson’s disease' },
  { code: 'I69.32', description: 'Aphasia (language impairment)' },
  { code: 'R47.1', description: 'Dysarthria (motor speech disorder)' },
  { code: 'R13.10', description: 'Dysphagia (difficulty swallowing)' },

  // --- GENERAL MOBILITY & AFTERCARE ---
  { code: 'M62.81', description: 'Muscle weakness (Generalized debility)' },
  { code: 'R26.2', description: 'Difficulty in walking, not elsewhere classified (Gait abnormality)' },
  { code: 'R26.81', description: 'Unsteadiness on feet (Balance issue)' },
  { code: 'Z47.1', description: 'Aftercare following joint replacement surgery' },
  { code: 'I25.10', description: 'Chronic ischemic heart disease (for Cardiac Rehab)' },
  { code: 'J44.9', description: 'Chronic Obstructive Pulmonary Disease (COPD) (for Pulmonary Rehab)' },
];

// Helper function to format time (HH:MM)
const formatTime = (hour, minute = 0) => {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

// ✅ NEW: Doctor-portal style "When: MM/DD/YYYY at HH:MM"
const formatWhenLikeDoctorPortal = (startISO) => {
  if (!startISO) return 'N/A';
  const dt = new Date(startISO);

  const date = dt.toLocaleDateString('en-US'); // MM/DD/YYYY
  const time = dt.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }); // 09:00

  return `${date} at ${time}`;
};

// ✅ supports both cancelled/canceled (DB inconsistency)
const isCancelledStatus = (s) => {
  const v = String(s || '').toLowerCase().trim();
  return v === 'cancelled' || v === 'canceled';
};

// ✅ normalize for UI
const normalizeStatus = (s) => {
  const v = String(s || '').toLowerCase().trim();
  if (isCancelledStatus(v)) return 'cancelled'; // show one value consistently
  return v || 'scheduled';
};

function AdminAppointment() {
  const [currentDoctorId, setCurrentDoctorId] = useState(1);

  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [selectedSlotStartTime, setSelectedSlotStartTime] = useState(''); // HH:MM

  const [newApptData, setNewApptData] = useState({
    patientId: '',
    purpose: '',
    notes: '',
  });

  useEffect(() => {
    if (currentDoctorId) {
      fetchDoctorAppointments(currentDoctorId);
    } else {
      setAppointments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDoctorId]);

  const fetchDoctorAppointments = async (doctorId) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API}/api/appointments?doctor_id=${doctorId}`);
      setAppointments(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError('Failed to fetch staff schedule.');
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDoctorIdChange = (e) => {
    const id = parseInt(e.target.value);
    if (id > 0) setCurrentDoctorId(id);
  };

  const handleNewApptInputChange = (e) => {
    setNewApptData({ ...newApptData, [e.target.name]: e.target.value });
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setSelectedSlotStartTime('');
  };

  const handleSlotClick = (slot) => {
    if (slot.isAvailable) {
      setSelectedSlotStartTime(slot.startTime);
      setError('');
    }
  };

  /**
   * ✅ IMPORTANT CHANGE:
   * If cancelling -> call PUT /api/appointments/:id/cancel (backend deletes billing)
   * Otherwise -> PATCH /api/appointments/:id with status only
   */
  const handleStatusUpdate = async (appointmentId, newStatus) => {
    try {
      setError('');

      const normalized = normalizeStatus(newStatus);

      // ✅ cancel uses special endpoint (deletes billing)
      if (isCancelledStatus(normalized)) {
        await axios.put(`${API}/api/appointments/${appointmentId}/cancel`);
      } else {
        // normal update (scheduled/completed)
        await axios.patch(`${API}/api/appointments/${appointmentId}`, {
          status: normalized,
        });
      }

      fetchDoctorAppointments(currentDoctorId);
    } catch (err) {
      const msg = err.response?.data?.error || `Failed to update status for Appointment ${appointmentId}.`;
      setError(msg);
    }
  };

  const handleNewAppointmentSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSlotStartTime || !newApptData.patientId) {
      setError('Please select a time slot and enter a Patient ID.');
      return;
    }

    const appointmentTime = selectedSlotStartTime + ':00'; // HH:MM:SS

    try {
      setError('');
      await axios.post(`${API}/api/appointments`, {
        patientId: parseInt(newApptData.patientId),
        appointmentDate: selectedDate,
        appointmentTime: appointmentTime,
        doctorId: currentDoctorId,
        purpose: newApptData.purpose,
        notes: newApptData.notes,
      });

      fetchDoctorAppointments(currentDoctorId);
      setNewApptData({ patientId: '', purpose: '', notes: '' });
      setSelectedSlotStartTime('');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to schedule appointment';
      setError(errorMessage);
    }
  };

  // Generates available time slots, filtering out the doctor's own booked appointments
  const availableTimeSlots = useMemo(() => {
    const slots = [];

    // ✅ ignore cancelled appointments when checking availability
    const bookedSlots = appointments
      .filter(
        (appt) =>
          appt.doctor_id === currentDoctorId &&
          appt.startTime &&
          appt.startTime.startsWith(selectedDate) &&
          !isCancelledStatus(appt.status)
      )
      .map((appt) => ({
        start: new Date(appt.startTime),
        end: new Date(appt.endTime),
      }));

    for (let h = BUSINESS_START_HOUR; h < BUSINESS_END_HOUR; h++) {
      const start = formatTime(h);
      const end = formatTime(h + SLOT_DURATION_MINUTES / 60);

      const slotStart = new Date(`${selectedDate}T${start}:00`);
      const slotEnd = new Date(`${selectedDate}T${end}:00`);

      const isBooked = bookedSlots.some((booked) => slotStart < booked.end && slotEnd > booked.start);

      slots.push({
        startTime: start,
        endTime: end,
        isAvailable: !isBooked,
      });
    }

    return slots;
  }, [selectedDate, appointments, currentDoctorId]);

  return (
    <div className="appointments-page">
      <h2>🩺 Staff/Doctor Appointment Manager</h2>

      <div className="section-box" style={{ border: '2px solid #ccc', padding: '10px', marginBottom: '20px' }}>
        <label htmlFor="doctorIdInput" style={{ fontWeight: 'bold' }}>
          Current Staff/Doctor ID:
        </label>
        <input
          type="number"
          id="doctorIdInput"
          value={currentDoctorId}
          onChange={handleDoctorIdChange}
          min="1"
          style={{ marginLeft: '10px', width: '80px', padding: '5px' }}
        />
      </div>

      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}
      {isLoading && <p>Loading schedule...</p>}

      <div className="section-box" style={{ border: '2px solid #007bff', padding: '15px', marginBottom: '20px' }}>
        <h3>➕ Schedule New Appointment for a Patient (Doctor ID {currentDoctorId} is selected)</h3>

        <form onSubmit={handleNewAppointmentSubmit} className="appointment-form">
          <label htmlFor="patientId">Patient ID:</label>
          <input
            type="number"
            id="patientId"
            name="patientId"
            placeholder="Patient ID"
            value={newApptData.patientId}
            onChange={handleNewApptInputChange}
            required
          />

          <label htmlFor="selectedDate">Appointment Date:</label>
          <input type="date" id="selectedDate" name="selectedDate" value={selectedDate} onChange={handleDateChange} required />

          <label className="slots-label">
            Available Slots for: <span className="slots-date">{selectedDate}</span>
          </label>

          <div className="time-slots-grid">
            {availableTimeSlots.map((slot) => (
              <button
                key={slot.startTime}
                type="button"
                className={`slot-button 
                  ${slot.isAvailable ? 'available' : 'booked'}
                  ${selectedSlotStartTime === slot.startTime ? 'selected' : ''}`}
                onClick={() => handleSlotClick(slot)}
                disabled={!slot.isAvailable}
              >
                {slot.startTime} - {slot.endTime}
              </button>
            ))}
          </div>

          <label htmlFor="purpose">Purpose (ICD-10 Code):</label>
          <select id="purpose" name="purpose" value={newApptData.purpose} onChange={handleNewApptInputChange} required>
            <option value="">-- Select Diagnosis/Reason (ICD-10) --</option>
            {ICD10_CODES.map((code) => (
              <option key={code.code} value={code.code}>
                {`${code.code} - ${code.description}`}
              </option>
            ))}
          </select>

          <label htmlFor="notes">Notes (Optional):</label>
          <textarea id="notes" name="notes" placeholder="Any specific notes..." value={newApptData.notes} onChange={handleNewApptInputChange} />

          <button type="submit" disabled={!selectedSlotStartTime || !newApptData.patientId}>
            Book Appointment for Patient {newApptData.patientId}
          </button>
        </form>
      </div>

      {(() => {
        const now = new Date();

        const safeStartMs = (a) => {
          if (!a?.startTime) return 0;
          const d = new Date(a.startTime);
          return Number.isNaN(d.getTime()) ? 0 : d.getTime();
        };

        const sorted = [...appointments].sort((a, b) => safeStartMs(a) - safeStartMs(b));

        const upcoming = sorted.filter((appt) => appt?.startTime && new Date(appt.startTime) >= now);
        const past = sorted.filter((appt) => appt?.startTime && new Date(appt.startTime) < now);

        const renderCard = (appt, isPastCard = false) => {
          const status = normalizeStatus(appt.status);

          return (
            <div key={appt.appointment_id} className={`admin-appt-card ${isPastCard ? 'past' : ''}`}>
              <div className="admin-appt-header">
                <div className="admin-appt-purpose">{appt.purpose || 'N/A'}</div>

                {isPastCard ? (
                  <span className={`status-pill status-${status}`} title="Past appointment - status locked">
                    {status.toUpperCase()}
                  </span>
                ) : (
                  <select
                    value={status}
                    onChange={(e) => handleStatusUpdate(appt.appointment_id, e.target.value)}
                    className={`status-pill-select status-${status}`}
                    title="Change Status"
                  >
                    <option value="scheduled">SCHEDULED</option>
                    <option value="completed">COMPLETED</option>
                    <option value="cancelled">CANCELLED</option>
                  </select>
                )}
              </div>

              <div className="admin-appt-body">
                <p>
                  <strong>When:</strong> {formatWhenLikeDoctorPortal(appt.startTime)}
                </p>
                <p>
                  <strong>Patient:</strong> {appt.patientName || `ID: ${appt.patient_id}`}
                </p>

                {appt.notes ? (
                  <p>
                    <strong>Notes:</strong> {appt.notes}
                  </p>
                ) : null}
              </div>

              {!isPastCard && (
                <div className="admin-appt-actions">
                  <button
                    type="button"
                    className="btn-gray"
                    onClick={() => handleStatusUpdate(appt.appointment_id, 'completed')}
                    disabled={status === 'completed'}
                  >
                    Mark Completed
                  </button>

                  <button
                    type="button"
                    className="btn-red"
                    onClick={() => handleStatusUpdate(appt.appointment_id, 'cancelled')}
                    disabled={isCancelledStatus(status)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        };

        return (
          <>
            <h3 className="admin-appt-section-title">📅 Upcoming Appointments for Doctor ID {currentDoctorId}</h3>

            <div className="admin-appt-cards-wrap">
              {appointments.length === 0 ? (
                <p>No scheduled appointments found for Doctor ID {currentDoctorId}.</p>
              ) : upcoming.length === 0 ? (
                <p>No upcoming appointments found for Doctor ID {currentDoctorId}.</p>
              ) : (
                upcoming.map((appt) => renderCard(appt, false))
              )}
            </div>

            <h3 className="admin-appt-section-title" style={{ marginTop: '25px' }}>
              🕘 Past Appointments
            </h3>

            <div className="admin-appt-cards-wrap">
              {past.length === 0 ? <p>No past appointments found.</p> : past.map((appt) => renderCard(appt, true))}
            </div>
          </>
        );
      })()}
    </div>
  );
}

export default AdminAppointment;
