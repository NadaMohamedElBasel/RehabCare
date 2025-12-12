// src/components/StaffAppointmentManager.js

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './StaffAppointmentManager.css';

// Configuration: Clinic hours and slot duration (must match backend)
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 17;
const SLOT_DURATION_MINUTES = 60;

// Helper function to format time (HH:MM)
const formatTime = (hour, minute = 0) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

function StaffAppointmentManager() {
    // Current Doctor ID State (Allows scrolling/changing IDs)
    const [currentDoctorId, setCurrentDoctorId] = useState(1);

    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Scheduling State (for creating a new appointment for a patient)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
    const [selectedSlotStartTime, setSelectedSlotStartTime] = useState(''); // HH:MM
    // 🎯 FIX: Remove selectedSlotEndTime as it's not needed for submission
    // const [selectedSlotEndTime, setSelectedSlotEndTime] = useState('');
    const [newApptData, setNewApptData] = useState({
        patientId: '',
        purpose: '',
        notes: ''
    });

    useEffect(() => {
        if (currentDoctorId) {
            fetchDoctorAppointments(currentDoctorId);
        } else {
            setAppointments([]); // Clear appointments if ID is invalid
        }
    }, [currentDoctorId]);

    const fetchDoctorAppointments = async (currentDoctorId) => {
        setIsLoading(true);
        setError('');
        try {
            // Backend returns data with startTime and endTime fields
            const response = await axios.get(`http://localhost:5000/api/appointments?doctor_id=${currentDoctorId}`);
            setAppointments(response.data);
        } catch (err) {
            setError("Failed to fetch staff schedule.");
            setAppointments([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDoctorIdChange = (e) => {
        const id = parseInt(e.target.value);
        if (id > 0) {
            setCurrentDoctorId(id);
        }
    }

    const handleNewApptInputChange = (e) => {
        setNewApptData({ ...newApptData, [e.target.name]: e.target.value });
    };

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
        setSelectedSlotStartTime('');
        // 🎯 FIX: Remove end time reset
        // setSelectedSlotEndTime('');
    };

    const handleSlotClick = (slot) => {
        if (slot.isAvailable) {
            setSelectedSlotStartTime(slot.startTime);
            // 🎯 FIX: Only set start time
            // setSelectedSlotEndTime(slot.endTime);
            setError('');
        }
    };

    const handleStatusUpdate = async (appointmentId, newStatus) => {
        try {
            // 🎯 FIX: Use the consolidated simple PATCH endpoint
            await axios.patch(`http://localhost:5000/api/appointments/${appointmentId}`, {
                status: newStatus
            });
            fetchDoctorAppointments(currentDoctorId); // Refresh the list
        } catch (err) {
            setError(`Failed to update status for Appointment ${appointmentId}.`);
        }
    };

    const handleNewAppointmentSubmit = async (e) => {
        e.preventDefault();

        if (!selectedSlotStartTime || !newApptData.patientId) {
            setError("Please select a time slot and enter a Patient ID.");
            return;
        }

        // 🎯 FIX: Send the simple fields required by the backend schema
        const appointmentTime = selectedSlotStartTime + ':00'; // HH:MM:SS format

        try {
            await axios.post('http://localhost:5000/api/appointments', {
                patientId: parseInt(newApptData.patientId),
                appointmentDate: selectedDate, // YYYY-MM-DD
                appointmentTime: appointmentTime, // HH:MM:SS
                doctorId: currentDoctorId, // Automatically set the current doctor's ID
                purpose: newApptData.purpose,
                notes: newApptData.notes
            });

            fetchDoctorAppointments(currentDoctorId); // Refresh the list
            setNewApptData({ patientId: '', purpose: '', notes: '' });
            setSelectedSlotStartTime('');
            // 🎯 FIX: Remove end time reset
            // setSelectedSlotEndTime('');
            setError('');

        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Failed to schedule appointment';
            setError(errorMessage);
        }
    };

    // Generates available time slots, filtering out the doctor's own booked appointments
    const availableTimeSlots = useMemo(() => {
        const slots = [];
        const bookedSlots = appointments.filter(appt =>
            // Filter by the current staff ID and selected date
            appt.doctor_id === currentDoctorId && appt.startTime &&
            appt.startTime.startsWith(selectedDate)
        ).map(appt => ({
            start: new Date(appt.startTime),
            end: new Date(appt.endTime)
        }));

        for (let h = BUSINESS_START_HOUR; h < BUSINESS_END_HOUR; h++) {
            const start = formatTime(h);
            const end = formatTime(h + SLOT_DURATION_MINUTES / 60);

            const slotStart = new Date(`${selectedDate}T${start}:00`);
            const slotEnd = new Date(`${selectedDate}T${end}:00`);

            const isBooked = bookedSlots.some(booked =>
                // Check for overlap: (New Start < Existing End) AND (Existing Start < New End)
                (slotStart < booked.end && slotEnd > booked.start)
            );

            slots.push({
                startTime: start,
                endTime: end,
                isAvailable: !isBooked
            });
        }
        return slots;
    }, [selectedDate, appointments, currentDoctorId]);

    // Conditional rendering is only for the loading state at the top.
    // The main content should always be returned.

    return (
        <div className="scheduler-container">
            <h2>🩺 Staff/Doctor Appointment Manager</h2>
            <p>Welcome to the testing panel. Use the input below to change the Staff/Doctor ID you are viewing.</p>

            {/* --- DOCTOR ID SELECTION INPUT --- */}
            <div className="section-box" style={{ border: '2px solid #ccc', padding: '10px', marginBottom: '20px' }}>
                <label htmlFor="doctorIdInput" style={{ fontWeight: 'bold' }}>Current Staff/Doctor ID:</label>
                <input
                    type="number"
                    id="doctorIdInput"
                    value={currentDoctorId}
                    onChange={handleDoctorIdChange}
                    min="1"
                    style={{ marginLeft: '10px', width: '80px', padding: '5px' }}
                />
                <p style={{ marginTop: '5px' }}>
                    Viewing and scheduling appointments for **Doctor ID: {currentDoctorId}**.
                </p>
            </div>
            {/* ------------------------------------- */}


            {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

            {isLoading && <p>Loading schedule...</p>}

            {/* --- SECTION 1: CREATE NEW APPOINTMENT (Restored Content) --- */}
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
                    <input
                        type="date"
                        id="selectedDate"
                        name="selectedDate"
                        value={selectedDate}
                        onChange={handleDateChange}
                        required
                    />

                    <label>Available Slots for {selectedDate}:</label>
                    <div className="time-slots-grid">
                        {availableTimeSlots.map(slot => (
                            <button
                                key={slot.startTime}
                                type="button"
                                className={`slot-button 
                                    ${slot.isAvailable ? 'available' : 'booked'}
                                    ${selectedSlotStartTime === slot.startTime ? 'selected' : ''}`
                                }
                                onClick={() => handleSlotClick(slot)}
                                disabled={!slot.isAvailable}
                            >
                                {slot.startTime} - {slot.endTime}
                            </button>
                        ))}
                    </div>

                    <label htmlFor="purpose">Purpose:</label>
                    <input
                        type="text"
                        id="purpose"
                        name="purpose"
                        placeholder="Purpose of Visit (Mandatory)"
                        value={newApptData.purpose}
                        onChange={handleNewApptInputChange}
                        required
                    />

                    <label htmlFor="notes">Notes (Optional):</label>
                    <textarea
                        id="notes"
                        name="notes"
                        placeholder="Any specific notes..."
                        value={newApptData.notes}
                        onChange={handleNewApptInputChange}
                    />

                    <button type="submit" disabled={!selectedSlotStartTime || !newApptData.patientId}>
                        Book Appointment for Patient {newApptData.patientId}
                    </button>
                </form>
            </div>


            {/* --- SECTION 2: VIEW AND MANAGE SCHEDULE (Restored Content) --- */}
            <h3>📅 Upcoming Appointments for Doctor ID {currentDoctorId}</h3>
            <div className="appointments-list-container">
                {appointments.length === 0 ? (
                    <p>No scheduled appointments found for Doctor ID {currentDoctorId}.</p>
                ) : (
                    <ul className="appointments-list">
                        {appointments.map((appt) => (
                            <li key={appt.appointment_id} className="appointment-item doctor-view">
                                <div className="appt-info">
                                    {/* Display time using the ISO strings returned by the backend */}
                                    <strong>
                                        {appt.startTime ? new Date(appt.startTime).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        }) : 'N/A'}
                                        -
                                        {appt.endTime ? new Date(appt.endTime).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        }) : 'N/A'}
                                    </strong>
                                    <p>Patient: **{appt.patientName || `ID: ${appt.patient_id}`}**</p>
                                    <p>Purpose: {appt.purpose}</p>
                                    <p>Notes: {appt.notes}</p>
                                </div>
                                <div className="appt-actions">
                                    <label htmlFor={`status-${appt.appointment_id}`} className="status-label">Change
                                        Status:</label>
                                    <select
                                        id={`status-${appt.appointment_id}`}
                                        value={(appt.status || 'scheduled').toLowerCase()}
                                        onChange={(e) => handleStatusUpdate(appt.appointment_id, e.target.value)}
                                        className={`status-dropdown status-${(appt.status || 'scheduled').toLowerCase()}`}
                                    >
                                        {/* You can define these options as a constant if you use them elsewhere */}
                                        <option value="scheduled">Scheduled</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default StaffAppointmentManager;