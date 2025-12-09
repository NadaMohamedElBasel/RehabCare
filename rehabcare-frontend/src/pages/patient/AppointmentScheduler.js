import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import "./AppointmentScheduler.css";

function AppointmentScheduler() {
  const { patientId } = useParams();

  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [pastAppointments, setPastAppointments] = useState([]);
  const [formData, setFormData] = useState({
    appointmentDate: "",
    appointmentTime: "",
    purpose: "",
    doctor: "",
    notes: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchAppointments();
  }, [patientId]);

  const fetchAppointments = async () => {
    try {
      const response = await axios.get(
        `http://127.0.0.1:5000/api/appointments/${patientId}`
      );
      categorizeAppointments(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch appointments");
    }
  };

  const categorizeAppointments = (appts) => {
    const now = new Date();
    const upcoming = [];
    const past = [];

    appts.forEach((appt) => {
      try {
        const date = new Date(appt.appointment_date);

        let fullDateTime;
        if (appt.appointment_time) {
          const [h, m, s] = appt.appointment_time
            .split(":")
            .map((n) => parseInt(n, 10));
          fullDateTime = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            h,
            m,
            s || 0
          );
        } else {
          fullDateTime = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            23,
            59,
            59
          );
        }

        if (fullDateTime >= now) upcoming.push(appt);
        else past.push(appt);
      } catch (error) {
        console.error("Date parsing error:", error);
      }
    });

    const sortAsc = (a, b) =>
      new Date(`${a.appointment_date} ${a.appointment_time || "23:59"}`) -
      new Date(`${b.appointment_date} ${b.appointment_time || "23:59"}`);

    const sortDesc = (a, b) =>
      new Date(`${b.appointment_date} ${b.appointment_time || "23:59"}`) -
      new Date(`${a.appointment_date} ${a.appointment_time || "23:59"}`);

    setUpcomingAppointments(upcoming.sort(sortAsc));
    setPastAppointments(past.sort(sortDesc));
  };

  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleEditInputChange = (e) =>
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://127.0.0.1:5000/api/appointments", {
        patientId,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        purpose: formData.purpose,
        doctorId: formData.doctor,
        notes: formData.notes,
      });

      setSuccess("Appointment scheduled successfully!");
      fetchAppointments();
      setTimeout(() => setSuccess(""), 3000);

      setFormData({
        appointmentDate: "",
        appointmentTime: "",
        purpose: "",
        doctor: "",
        notes: "",
      });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to schedule appointment");
    }
  };

  const handleEditClick = (appt) => {
    setEditingId(appt.appointment_id);
    setEditFormData({
      appointmentDate: appt.appointment_date,
      appointmentTime: appt.appointment_time || "",
      purpose: appt.purpose,
      doctor_id: appt.doctor_id || "",
      notes: appt.notes || "",
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `http://127.0.0.1:5000/api/appointments/${editingId}`,
        editFormData
      );

      setSuccess("Appointment updated!");
      setEditingId(null);
      fetchAppointments();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update appointment");
    }
  };

  const handleCancel = async (apptId) => {
    try {
      await axios.put(
        `http://127.0.0.1:5000/api/appointments/${apptId}/cancel`
      );

      setSuccess("Appointment cancelled!");
      fetchAppointments();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to cancel appointment");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const formatDateTime = (date, time) => {
    return new Date(date).toLocaleDateString() + (time ? ` at ${time}` : "");
  };

  return (
    <div className="appointment-scheduler-container">
      <h2>Appointment Scheduling</h2>

      {/* Schedule Form */}
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
              value={formData.purpose}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Doctor ID:</label>
            <input
              type="number"
              name="doctor"
              value={formData.doctor}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label>Notes:</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="2"
            />
          </div>

          <button type="submit" className="btn-primary">
            Schedule Appointment
          </button>
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
                      />
                    </div>

                    <div className="button-group">
                      <button type="submit" className="btn-save">
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="btn-cancel-edit"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="appointment-header">
                      <h4>{appt.purpose}</h4>
                      <span
                        className={`status-badge ${
                          (appt.status || "").toLowerCase() === "cancelled"
                            ? "cancelled"
                            : "scheduled"
                        }`}
                      >
                        {appt.status}
                      </span>
                    </div>

                    <div className="appointment-details">
                      <p>
                        <strong>Date & Time:</strong>{" "}
                        {formatDateTime(
                          appt.appointment_date,
                          appt.appointment_time
                        )}
                      </p>
                      {appt.doctor_id && (
                        <p>
                          <strong>Doctor ID:</strong> {appt.doctor_id}
                        </p>
                      )}
                      {appt.notes && (
                        <p>
                          <strong>Notes:</strong> {appt.notes}
                        </p>
                      )}
                    </div>

                    {appt.status !== "cancelled" && (
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
                    )}
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
                      (appt.status || "").toLowerCase() === "cancelled"
                        ? "cancelled"
                        : "completed"
                    }`}
                  >
                    {appt.status || "completed"}
                  </span>
                </div>

                <div className="appointment-details">
                  <p>
                    <strong>Date & Time:</strong>{" "}
                    {formatDateTime(
                      appt.appointment_date,
                      appt.appointment_time
                    )}
                  </p>
                  {appt.doctor_id && (
                    <p>
                      <strong>Doctor ID:</strong> {appt.doctor_id}
                    </p>
                  )}
                  {appt.notes && (
                    <p>
                      <strong>Notes:</strong> {appt.notes}
                    </p>
                  )}
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
