// src/pages/admin/ManageAppointments.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Admin.css";

function ManageAppointments() {
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/appointments");
      setAppointments(res.data);
    } catch (err) {
      console.error("Fetch appointments error", err);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`http://localhost:5000/api/appointments/${id}`, {
        status
      });
      fetchAppointments();
    } catch (err) {
      console.error("Update status error", err);
    }
  };

  const deleteAppointment = async (id) => {
    if (!window.confirm("Delete this appointment?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/appointments/${id}`);
      fetchAppointments();
    } catch (err) {
      console.error("Delete appointment error", err);
    }
  };

  return (
    <div className="admin-section">
      <h2>Manage Appointments</h2>

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Patient</th>
            <th>Doctor</th>
            <th>Date</th>
            <th>Time</th>
            <th>Purpose</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((a) => (
            <tr key={a.appointment_id}>
              <td>{a.appointment_id}</td>
              <td>{a.patient_name || a.patient_id}</td>
              <td>{a.doctor_name || a.doctor_id}</td>
              <td>{a.appointment_date}</td>
              <td>{a.appointment_time}</td>
              <td>{a.purpose}</td>
              <td>{a.status}</td>
              <td>
                <select
                  value={a.status || ""}
                  onChange={(e) =>
                    updateStatus(a.appointment_id, e.target.value)
                  }
                  style={{ marginRight: "5px" }}
                >
                  <option value="">Change Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  className="btn-delete"
                  onClick={() => deleteAppointment(a.appointment_id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ManageAppointments;
