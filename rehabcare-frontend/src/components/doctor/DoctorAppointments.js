import React, { useState, useEffect } from "react";
import axios from "axios";
import "../AppointmentScheduler.css";

const API = "http://localhost:5000";

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

const toYYYYMMDD = (dateLike) => {
  if (!dateLike) return "";
  const s = String(dateLike);
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const toHHMM = (timeLike) => {
  if (!timeLike) return "";
  const s = String(timeLike);
  if (s.includes(":")) return s.slice(0, 5);
  return "";
};

const toHHMMSS = (hhmm) => {
  if (!hhmm) return "";
  const s = String(hhmm);
  if (s.length === 5 && s[2] === ":") return `${s}:00`;
  if (s.length >= 8 && s[2] === ":" && s[5] === ":") return s.slice(0, 8);
  return "";
};

// ✅ support both "cancelled" and "canceled"
const isCancelledStatus = (status) => {
  const s = String(status || "").toLowerCase().trim();
  return s === "cancelled" || s === "canceled";
};

// ✅ normalize for UI dropdown
const normalizeStatus = (status) => {
  if (isCancelledStatus(status)) return "canceled";
  const s = String(status || "").toLowerCase().trim();
  return s || "scheduled";
};

function DoctorAppointments({ doctorId }) {
  const [upcomingAppointments, setUpcoming] = useState([]);
  const [pastAppointments, setPast] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [allAppointments, setAllAppointments] = useState([]);
  const [doctorDayAppointments, setDoctorDayAppointments] = useState([]);

  useEffect(() => {
    fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  const fetchAppointments = async () => {
    try {
      const res = await axios.get(`${API}/api/doctor/${doctorId}/appointments`);
      const list = Array.isArray(res.data) ? res.data : [];
      setAllAppointments(list);
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
      // ✅ If canceled, treat it as past (or you can "return;" to hide completely)
      if (isCancelledStatus(appt.status)) {
        past.push(appt);
        return;
      }

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

  useEffect(() => {
    if (!editingId || !editFormData.appointmentDate) {
      setDoctorDayAppointments([]);
      return;
    }

    const selectedDate = editFormData.appointmentDate;

    const sameDay = allAppointments
      .filter((a) => {
        const d = toYYYYMMDD(a.appointment_date);
        const cancelled = isCancelledStatus(a.status);
        const same = d === selectedDate;
        const notSameAppt = a.appointment_id !== editingId;
        return same && !cancelled && notSameAppt;
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
    // ✅ Block edit if canceled
    if (isCancelledStatus(appt.status)) return;

    setEditingId(appt.appointment_id);

    setEditFormData({
      notes: appt.notes || "",
      status: normalizeStatus(appt.status),
      appointmentDate: toYYYYMMDD(appt.appointment_date),
      appointmentTime: toHHMM(appt.appointment_time),
      doctorId: doctorId,
      patientId: appt.patient_id,
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editFormData.appointmentDate || !editFormData.appointmentTime) {
      setError("Please select appointment date and time slot.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      // ✅ if status is canceled -> call /cancel endpoint so backend deletes billing
      if (isCancelledStatus(editFormData.status)) {
        await axios.put(`${API}/api/appointments/${editingId}/cancel`, {
          notes: editFormData.notes,
        });

        setSuccess("Appointment canceled (billing removed).");
        setEditingId(null);
        fetchAppointments();
        setTimeout(() => setSuccess(""), 2500);
        return;
      }

      await axios.put(`${API}/api/appointments/${editingId}`, {
        status: editFormData.status,
        notes: editFormData.notes,
        appointmentDate: editFormData.appointmentDate,
        appointmentTime: toHHMMSS(editFormData.appointmentTime),
        doctorId: editFormData.doctorId,
        patientId: editFormData.patientId,
      });

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
      setError("");
      setSuccess("");
      await axios.put(`${API}/api/appointments/${id}/cancel`);
      setSuccess("Appointment canceled (billing removed).");
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

      <section className="appointments-section">
        <h3>Upcoming Appointments</h3>

        {upcomingAppointments.length === 0 ? (
          <p className="no-appointments">No upcoming appointments.</p>
        ) : (
          <div className="appointments-list">
            {upcomingAppointments.map((appt) => {
              const cancelled = isCancelledStatus(appt.status);

              return (
                <div key={appt.appointment_id} className="appointment-card upcoming">
                  {editingId === appt.appointment_id ? (
                    <form onSubmit={handleEditSubmit} className="edit-form">
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
                              appointmentTime: "",
                            }))
                          }
                          required
                        />
                      </div>

                      <div className="form-group slot-selector">
                        <label>Select Time Slot:</label>

                        {!editFormData.appointmentDate && (
                          <p className="hint-text">Select Date first to see available slots.</p>
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
                          value={normalizeStatus(editFormData.status)}
                          onChange={(e) =>
                            setEditFormData((prev) => ({ ...prev, status: e.target.value }))
                          }
                        >
                          <option value="scheduled">Scheduled</option>
                          <option value="completed">Completed</option>
                          <option value="canceled">Canceled</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Notes:</label>
                        <textarea
                          name="notes"
                          rows="2"
                          value={editFormData.notes || ""}
                          onChange={(e) =>
                            setEditFormData((prev) => ({ ...prev, notes: e.target.value }))
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
                        <span className={`status-badge ${normalizeStatus(appt.status)}`}>
                          {normalizeStatus(appt.status)}
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

                      {/* ✅ Hide Edit/Cancel if canceled */}
                      {!cancelled && (
                        <div className="button-group">
                          <button className="btn-edit" onClick={() => handleEditClick(appt)}>
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
              );
            })}
          </div>
        )}
      </section>

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
                  <span className={`status-badge ${normalizeStatus(appt.status)}`}>
                    {normalizeStatus(appt.status)}
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
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default DoctorAppointments;
