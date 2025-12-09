// src/components/AppointmentScheduler.js - Complete File (MODIFIED)

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './AppointmentScheduler.css';

// Configuration: Clinic hours and slot duration
const BUSINESS_START_HOUR = 9; // 9 AM
const BUSINESS_END_HOUR = 17;  // 5 PM (17:00)
const SLOT_DURATION_MINUTES = 60; // 1-hour slots

// Helper function to format time (HH:MM)
const formatTime = (hour, minute = 0) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

function AppointmentScheduler() {
    const { patientId } = useParams();
    const [appointments, setAppointments] = useState([]);

    // Manage date and time selection separately for the calendar
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
    const [selectedSlotStartTime, setSelectedSlotStartTime] = useState(''); // HH:MM
    const [selectedSlotEndTime, setSelectedSlotEndTime] = useState('');     // HH:MM

    // RETAINED STATE: For purpose and doctor
    const [formData, setFormData] = useState({
        purpose: '',
        doctor: '',
        notes: ''
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (patientId) {
            fetchAppointments();
        }
    }, [patientId]);

    const fetchAppointments = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/api/appointments/patient/${patientId}`);
            setAppointments(response.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch appointments');
            setAppointments([]);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
        // Reset time selection when date changes
        setSelectedSlotStartTime('');
        setSelectedSlotEndTime('');
    };

    // Generates available time slots, accounting for existing appointments (simplified)
    const availableTimeSlots = useMemo(() => {
        const slots = [];
        const bookedSlots = appointments.filter(appt =>
            // Check if the appointment's date part matches the selected date
            // Note: We check against the server-provided startDate field now.
            appt.startDate && appt.startDate.startsWith(selectedDate)
        ).map(appt => ({
            // Use server-provided startDate and endDate for conflict check
            start: new Date(appt.startDate),
            end: new Date(appt.endDate)
        }));

        const slotDurationMs = SLOT_DURATION_MINUTES * 60000;

        // This part generates potential slots (e.g., 09:00, 10:00, etc.)
        for (let h = BUSINESS_START_HOUR; h < BUSINESS_END_HOUR; h++) {
            const start = formatTime(h);
            const end = formatTime(h + SLOT_DURATION_MINUTES / 60); // Assuming 60 min slots

            const slotStart = new Date(`${selectedDate}T${start}:00`);
            const slotEnd = new Date(`${selectedDate}T${end}:00`);

            // Basic availability check (needs robust server-side conflict check)
            const isBooked = bookedSlots.some(booked =>
                // Check for overlap: slotStart is before booked.end AND slotEnd is after booked.start
                (slotStart < booked.end && slotEnd > booked.start)
            );

            slots.push({
                startTime: start,
                endTime: end,
                isAvailable: !isBooked
            });
        }
        return slots;
    }, [selectedDate, appointments]);

    const handleSlotClick = (slot) => {
        if (slot.isAvailable) {
            setSelectedSlotStartTime(slot.startTime);
            setSelectedSlotEndTime(slot.endTime);
            setError(''); // Clear any previous errors
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedSlotStartTime || !selectedSlotEndTime) {
            setError("Please select a time slot.");
            return;
        }

        // --- MODIFICATION START ---
        // Combine selected date and time slots into ISO format strings.
        // Use 'startDate' and 'endDate' to match your database schema.
        const startDate = `${selectedDate}T${selectedSlotStartTime}:00`;
        const endDate = `${selectedDate}T${selectedSlotEndTime}:00`;
        // --- MODIFICATION END ---


        try {
            await axios.post('http://localhost:5000/api/appointments', {
                ...formData,
                patientId: parseInt(patientId),
                startDate: startDate, // Send as startDate
                endDate: endDate,     // Send as endDate
                doctorId: formData.doctor
            });
            fetchAppointments(); // Refresh the list

            // Reset form and slot selection
            setFormData({ purpose: '', doctor: '', notes: '' });
            setSelectedSlotStartTime('');
            setSelectedSlotEndTime('');
            setError('');

        } catch (err) {
            // Check for specific conflict error from the backend (if implemented)
            const errorMessage = err.response?.data?.error || 'Failed to schedule appointment';
            setError(errorMessage);
        }
    };

    if (!patientId) {
        return <div>Error: Patient ID is missing. Please log in or check the URL.</div>;
    }

    // Helper to format ISO date string for display
    const formatDateForDisplay = (isoDateString) => {
        if (!isoDateString) return 'N/A';
        const date = new Date(isoDateString);
        return date.toLocaleString(); // e.g., 12/8/2025, 6:30:00 PM
    }

    return (
        <div className="scheduler-container">
            <h2>Book Appointment (Patient ID: {patientId})</h2>

            <form onSubmit={handleSubmit} className="appointment-form">

                {/* 1. DATE PICKER (Uses selectedDate state) */}
                <label htmlFor="selectedDate">Appointment Date:</label>
                <input
                    type="date"
                    id="selectedDate"
                    name="selectedDate"
                    value={selectedDate}
                    onChange={handleDateChange}
                    required
                />

                {/* 2. TIME SLOT GRID */}
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

                {/* Selected Slot Display */}
                {selectedSlotStartTime && (
                    <p className="selected-time">
                        Selected Time: {selectedSlotStartTime} - {selectedSlotEndTime}
                    </p>
                )}

                {/* 3. PURPOSE */}
                <label htmlFor="purpose">Purpose:</label>
                <input
                    type="text"
                    id="purpose"
                    name="purpose"
                    placeholder="Purpose of Visit"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    required
                />

                {/* 4. DOCTOR ID (Simple text input for now) */}
                <label htmlFor="doctor">Doctor ID:</label>
                <input
                    type="number"
                    id="doctor"
                    name="doctor"
                    placeholder="e.g., 1"
                    value={formData.doctor}
                    onChange={handleInputChange}
                    required
                />

                {/* 5. NOTES */}
                <label htmlFor="notes">Notes (Optional):</label>
                <textarea
                    id="notes"
                    name="notes"
                    placeholder="Any specific notes for the doctor..."
                    value={formData.notes}
                    onChange={handleInputChange}
                />

                <button type="submit" disabled={!selectedSlotStartTime}>Schedule Appointment</button>
            </form>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {/* Appointments List */}
            <h3>Your Appointments</h3>

            {appointments.length === 0 ? (
                <p>You have no scheduled appointments.</p>
            ) : (
                <ul className="appointments-list">
                    {appointments.map((appt) => (
                        <li key={appt.appointment_id} className="appointment-item">
                            {/* --- MODIFICATION START --- */}
                            {/* Use startDate and endDate, formatted for display */}
                            <strong>
                                {formatDateForDisplay(appt.startDate)}
                            </strong> - {appt.purpose}
                            {/* --- MODIFICATION END --- */}

                            <br/>
                            <small>
                                Doctor ID: {appt.doctor_id} |
                                Status: <span className={`status-tag status-${(appt.status || '').toLowerCase()}`}>
                                    {appt.status}
                                </span>
                                {appt.notes && ` | Notes: ${appt.notes}`}
                            </small>
                        </li>
                    ))}
                </ul>
            )}

        </div>
    );

}

export default AppointmentScheduler;