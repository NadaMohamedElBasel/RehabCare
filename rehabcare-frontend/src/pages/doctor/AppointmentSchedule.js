// src/pages/doctor/AppointmentSchedule.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AppointmentSchedule.css";

function AppointmentSchedule() {
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/api/doctor/appointments");
      setAppointments(res.data);
    } catch (err) {
      setError("Failed to load appointments");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`http://127.0.0.1:5000/api/doctor/appointments/${id}`, {
        status,
      });
      fetchAppointments();
    } catch (err) {
      setError("Failed to update status");
    }
  };

  return (
    <div className="doctor-appointments-container">
      <h2>Appointments</h2>

      {error && <p className="error-message">{error}</p>}

      <div className="appointment-list">
        {appointments.map((a) => (
          <div key={a.appointment_id} className="appointment-card">
            <h4>{a.purpose}</h4>
            <p><strong>Patient:</strong> {a.first_name} {a.last_name}</p>
            <p><strong>Date:</strong> {a.appointment_date}</p>
            <p><strong>Time:</strong> {a.appointment_time}</p>

            <select
              value={a.status}
              onChange={(e) => updateStatus(a.appointment_id, e.target.value)}
            >
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AppointmentSchedule;
