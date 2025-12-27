import React, { useState, useEffect } from "react";
import axios from "axios";
import "../AppointmentScheduler.css";

// ✅ Time slots (1 hour)
const generateTimeSlots = (startHour = 9, endHour = 17) => {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    const start = String(hour).padStart(2, "0") + ":00";
    const end = String(hour + 1).padStart(2, "0") + ":00";
    slots.push({ start, display: `${start} - ${end}` });
  }
  return slots;
};

const AVAILABLE_SLOTS = generateTimeSlots(9, 17);

// ✅ Helpers
const toYYYYMMDD = (dateLike) => {
  if (!dateLike) return "";
  // if already "YYYY-MM-DD"
  const s = String(dateLike);
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const toHHMM = (timeLike) => {
  if (!timeLike) return "";
  const s = String(timeLike);
  // "HH:MM" or "HH:MM:SS"
  if (s.includes(":")) return s.slice(0, 5);
  return "";
};

function DoctorAppointments({ doctorId }) {
  const [upcomingAppointments, setUpcoming] = useState([]);
  const [pastAppointments, setPast] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ NEW: keep all appointments for availability check
  const [allAppointments, setAllAppointments] = useState([]);
  const [doctorDayAppointments, setDoctorDayAppointments] = useState([]);

  useEffect(() => {
    fetchAppointments();
  }, [doctorId]);

  const fetchAppointments = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/doctor/${doctorId}/appointments`
      );
      const list = Array.isArray(res.data) ? res.data : [];
      setAllAppointments(list); // ✅ keep for slots availability
      categorizeAppointments(list);
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
        const [h, m, s] = String(appt.appointment_time).split(":");
        apptDateTime = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          Number(h),
          Number(m),
          Number(s || 0)
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

    // (optional improvement) sort by date+time
    const dtKey = (a) => {
      const d = new Date(a.appointment_date);
      const t = toHHMM(a.appointment_time);
      const [hh, mm] = t ? t.split(":").map(Number) : [23, 59];
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, 0).getTime();
    };

    upcoming.sort((a, b) => dtKey(a) - dtKey(b));
    past.sort((a, b) => dtKey(b) - dtKey(a));

    setUpcoming(upcoming);
    setPast(past);
  };

  // ✅ When edit date changes -> compute booked slots for that day (excluding cancelled + excluding current edit)
  useEffect(() => {
    if (!editingId || !editFormData.appointmentDate) {
      setDoctorDayAppointments([]);
      return;
    }

    const selectedDate = editFormData.appointmentDate; // YYYY-MM-DD

    const sameDay = allAppointments
      .filter((a) => {
        const d = toYYYYMMDD(a.appointment_date);
        const isCancelled = String(a.status || "").toLowerCase() === "cancelled";
        const same = d === selectedDate;
        const notSameAppt = a.appointment_id !== editingId;
        return same && !isCancelled && notSameAppt;
      })
      .map((a) => ({
        appointment_id: a.appointment_id,
        time: toHHMM(a.appointment_time),
      }))
      .filter((x) => x.time);

    setDoctorDayAppointments(sameDay);
  }, [editingId, editFormData.appointmentDate, allAppointments]);

  const isSlotBooked = (slotStart) => {
    return doctorDayAppointments.some((a) => a.time === slotStart);
  };

  const handleEditClick = (appt) => {
    setEditingId(appt.appointment_id);

    setEditFormData({
      notes: appt.notes || "",
      status: appt.status || "scheduled",

      // ✅ NEW: allow editing date/time
      appointmentDate: toYYYYMMDD(appt.appointment_date),
      appointmentTime: toHHMM(appt.appointment_time),
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    // ✅ require date/time if you want (optional)
    if (!editFormData.appointmentDate || !editFormData.appointmentTime) {
      setError("Please select appointment date and time slot.");
      return;
    }

    try {
      setError("");

      // ✅ Send status/notes + date/time
      await axios.put(
        `http://localhost:5000/api/appointments/${editingId}`,
        {
          status: editFormData.status,
          notes: editFormData.notes,

          appointmentDate: editFormData.appointmentDate,
          appointmentTime: editFormData.appointmentTime,
        }
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
    if (t) str += " at " + String(t).slice(0, 5);
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
                    {/* ✅ NEW: Edit Date */}
                    <div className="form-group">
                      <label>Date:</label>
                      <input
                        type="date"
                        name="appointmentDate"
                        value={editFormData.appointmentDate || ""}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            appointmentDate: e.target.value,
                            appointmentTime: "", // ✅ reset time if date changed
                          }))
                        }
                        required
                      />
                    </div>

                    {/* ✅ NEW: Time Slots */}
                    <div className="form-group slot-selector">
                      <label>Select Time Slot:</label>

                      {!editFormData.appointmentDate && (
                        <p className="hint-text">
                          Select Date first to see available slots.
                        </p>
                      )}

                      <div className="slot-buttons-container">
                        {AVAILABLE_SLOTS.map((slot) => {
                          const booked = isSlotBooked(slot.start);
                          const disabled = booked || !editFormData.appointmentDate;

                          return (
                            <button
                              key={slot.start}
                              type="button"
                              className={`slot-button ${
                                editFormData.appointmentTime === slot.start ? "selected" : ""
                              } ${booked ? "booked" : ""}`}
                              onClick={() =>
                                setEditFormData((prev) => ({
                                  ...prev,
                                  appointmentTime: slot.start,
                                }))
                              }
                              disabled={disabled}
                            >
                              {slot.display}
                            </button>
                          );
                        })}
                      </div>

                      <input
                        type="hidden"
                        name="appointmentTime"
                        value={editFormData.appointmentTime || ""}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Status:</label>
                      <select
                        name="status"
                        value={editFormData.status || "scheduled"}
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
                        value={editFormData.notes || ""}
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
                        onClick={() => {
                          setEditingId(null);
                          setEditFormData({});
                        }}
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
                      <button className="btn-edit" onClick={() => handleEditClick(appt)}>
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
                    <strong>Patient:</strong> {appt.first_name} {appt.last_name}
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
