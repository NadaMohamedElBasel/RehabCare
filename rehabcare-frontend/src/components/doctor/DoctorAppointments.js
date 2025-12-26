import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import "../AppointmentScheduler.css";

function DoctorAppointments({ doctorId }) {
  const BUSINESS_START_HOUR = 9;
  const BUSINESS_END_HOUR = 17;
  const [upcomingAppointments, setUpcoming] = useState([]);
  const [pastAppointments, setPast] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const formatTime = (hour) => {
    return `${hour.toString().padStart(2, '0')}:00`;
};



  const availableSlots = useMemo(() => {
    const slots = [];

    const activeApptsOnDate = [...upcomingAppointments, ...pastAppointments].filter(appt => {
      const apptDate = new Date(appt.appointment_date).toISOString().split('T')[0];
      // Include all statuses EXCEPT cancelled so we know the slot is occupied
      return apptDate === selectedDate && appt.status !== 'cancelled';
    });

    for (let h = BUSINESS_START_HOUR; h < BUSINESS_END_HOUR; h++) {
      const timeString = formatTime(h);

      // Look for an appointment that matches this hour
      const existingAppt = activeApptsOnDate.find(appt =>
        appt.appointment_time && appt.appointment_time.startsWith(timeString)
      );

      slots.push({
        time: timeString,
        display: `${timeString} - ${formatTime(h + 1)}`,
        isAvailable: !existingAppt, // If no appointment, it's green (available)
        appointmentId: existingAppt ? existingAppt.appointment_id : null,
        isPatientAppt: existingAppt ? !!existingAppt.patient_id : false
      });
    }
    return slots;
  }, [selectedDate, upcomingAppointments, pastAppointments]);

  const handleToggleSlot = async (slot) => {
    if (slot.isAvailable) {
      // BLOCKING (Turn Green to Red)
      try {
        await axios.post("http://localhost:5000/api/doctor/block-time", {
          doctorId,
          date: selectedDate,
          time: slot.time + ":00",
          note: "Doctor Personal Block"
        });
        setSuccess(`Blocked ${slot.time}`);
        await fetchAppointments(); // Refresh data to update colors
      } catch (err) {
        setError("Conflict: Slot might already be taken.");
      }
    } else {
      // UNBLOCKING (Turn Red to Green)
      if (slot.isPatientAppt) {
        setError("Cannot unblock: This is a patient appointment. Cancel it below.");
        return;
      }

      try {
        // We use the ID found in the useMemo to cancel the specific block
        await axios.put(`http://localhost:5000/api/appointments/${slot.appointmentId}/cancel`);
        setSuccess(`Unblocked ${slot.time}`);
        await fetchAppointments(); // Refresh data to update colors
      } catch (err) {
        setError("Failed to unblock slot.");
      }
    }

    // Clear messages after 2.5s
    setTimeout(() => { setError(""); setSuccess(""); }, 2500);
  };


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
        <section className="block-time-section">
          <h3>Manage Availability</h3>
          <div className="date-picker-container">
            <label>Select Date: </label>
            <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="slots-grid">
            {availableSlots.map((slot) => (
                <button
                    key={slot.time}
                    className={`slot-btn ${slot.isAvailable ? 'available' : 'booked'}`}
                    onClick={() => handleToggleSlot(slot)} // Changed from handleBlockSlot
                >
                  {slot.display}
                  <br/>
                  <span>
        {slot.isAvailable ? "Available" : "Occupied / Blocked"}
      </span>
                </button>
            ))}
          </div>
        </section>

        {/* UPCOMING APPOINTMENTS */}
        <section className="appointments-section">
          <h3>Upcoming Appointments</h3>

          {upcomingAppointments.length === 0 ? (
              <p className="no-appointments">No upcoming appointments.</p>
          ) : (
              <div className="appointments-list">
                {upcomingAppointments.map((appt) => (
                    <div key={appt.appointment_id}
                         className={`appointment-card upcoming ${!appt.patient_id ? "manual-block" : ""}`}>
                      {editingId === appt.appointment_id ? (
                          <form onSubmit={handleEditSubmit} className="edit-form">
                            {/* ... (Your existing edit form code) */}
                          </form>
                      ) : (
                          <>
                            <div className="appointment-header">
                              {/* Use the status 'manual' or the purpose to show it's a block */}
                              <h4>{!appt.patient_id ? `🚫 ${appt.purpose}` : appt.purpose}</h4>
                              <span className={`status-badge ${appt.status}`}>
            {appt.status}
          </span>
                            </div>

                            <div className="appointment-details">
                              <p>
                                <strong>When:</strong> {formatDateTime(appt.appointment_date, appt.appointment_time)}
                              </p>

                              <p>
                                <strong>Patient:</strong>{" "}
                                {appt.patient_id
                                    ? `${appt.first_name} ${appt.last_name}`
                                    : <span className="manual-text">Manual Input / Unavailable</span>
                                }
                              </p>

                              {appt.notes && <p><strong>Notes:</strong> {appt.notes}</p>}
                            </div>

                            <div className="button-group">
                              {/* Allow doctors to edit or unblock (cancel) these entries */}
                              <button className="btn-edit" onClick={() => handleEditClick(appt)}>
                                Edit
                              </button>
                              {appt.status !== "cancelled" && (
                                  <button className="btn-delete" onClick={() => handleCancel(appt.appointment_id)}>
                                    {appt.patient_id ? "Cancel" : "Unblock"}
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
