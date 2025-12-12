import React, { useState, useEffect } from "react";
import axios from "axios";
import "../AppointmentScheduler.css";

function DoctorAppointments({ doctorId }) {
  const [upcomingAppointments, setUpcoming] = useState([]);
  const [pastAppointments, setPast] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchAppointments();
  }, [doctorId]);

  const fetchAppointments = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/doctor/${doctorId}/appointments`
      );
      categorizeAppointments(res.data);
    } catch (err) {
      setError("Failed to load doctor appointments");
      console.error(err);
    }
  };

  const categorizeAppointments = (appts) => {
    const now = new Date();
    const upcoming = [];
    const past = [];

    appts.forEach((appt) => {
      const date = new Date(appt.appointment_date);
      let apptDateTime;

      if (appt.appointment_time) {
        const [h, m, s] = appt.appointment_time.split(":");
        apptDateTime = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          h,
          m,
          s || 0
        );
      } else {
        apptDateTime = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          23,
          59,
          59
        );
      }

      if (apptDateTime >= now) upcoming.push(appt);
      else past.push(appt);
    });

    upcoming.sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
    past.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));

    setUpcoming(upcoming);
    setPast(past);
  };

  const handleEditClick = (appt) => {
    setEditingId(appt.appointment_id);
    setEditFormData({
      notes: appt.notes || "",
      status: appt.status || "scheduled",
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `http://localhost:5000/api/appointments/${editingId}`,
        editFormData
      );
      setSuccess("Appointment updated!");
      setEditingId(null);
      fetchAppointments();
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      setError("Failed to update appointment");
    }
  };

  const handleCancel = async (id) => {
    try {
      await axios.put(`http://localhost:5000/api/appointments/${id}/cancel`);
      setSuccess("Appointment cancelled");
      fetchAppointments();
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      setError("Failed to cancel appointment");
    }
  };

  const formatDateTime = (d, t) => {
    let str = new Date(d).toLocaleDateString();
    if (t) str += " at " + t;
    return str;
  };

  return (
    <div className="appointment-scheduler-container">
      <h2>Doctor Appointments</h2>

      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}

      {/* UPCOMING APPOINTMENTS */}
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
                      <label>Status:</label>
                      <select
                        name="status"
                        value={editFormData.status}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, status: e.target.value })
                        }
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Notes:</label>
                      <textarea
                        name="notes"
                        rows="2"
                        value={editFormData.notes}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, notes: e.target.value })
                        }
                      />
                    </div>

                    <div className="button-group">
                      <button className="btn-save" type="submit">
                        Save
                      </button>
                      <button
                        className="btn-cancel-edit"
                        type="button"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="appointment-header">
                      <h4>{appt.purpose}</h4>
                      <span className={`status-badge ${appt.status}`}>
                        {appt.status}
                      </span>
                    </div>

                    <div className="appointment-details">
                      <p>
                        <strong>When:</strong>{" "}
                        {formatDateTime(appt.appointment_date, appt.appointment_time)}
                      </p>

                      <p>
                        <strong>Patient:</strong> {appt.first_name} {appt.last_name}
                      </p>

                      {appt.notes && (
                        <p>
                          <strong>Notes:</strong> {appt.notes}
                        </p>
                      )}
                    </div>

                    <div className="button-group">
                      <button
                        className="btn-edit"
                        onClick={() => handleEditClick(appt)}
                      >
                        Edit
                      </button>

                      {appt.status !== "cancelled" && (
                        <button
                          className="btn-delete"
                          onClick={() => handleCancel(appt.appointment_id)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* PAST APPOINTMENTS */}
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
                  <span className={`status-badge ${appt.status}`}>
                    {appt.status || "completed"}
                  </span>
                </div>

                <div className="appointment-details">
                  <p>
                    <strong>When:</strong>{" "}
                    {formatDateTime(appt.appointment_date, appt.appointment_time)}
                  </p>
                  <p>
                    <strong>Patient:</strong>{" "}
                    {appt.first_name} {appt.last_name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default DoctorAppointments;
