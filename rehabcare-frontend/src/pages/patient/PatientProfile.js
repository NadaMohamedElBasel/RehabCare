import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

import AppointmentScheduler from "./AppointmentScheduler";
import MedicalRecords from "./MedicalRecords";
import Prescriptions from "./Prescriptions";
import Billing from "./Billing";

import "./PatientProfile.css";

function PatientProfile() {
  const { patientId } = useParams();
  const [activeTab, setActiveTab] = useState("profile");

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    phoneNumber: "",
    gender: "",
  });

  const [formData, setFormData] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  // Fetch Patient Profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const id = patientId || localStorage.getItem("patientId");
        if (!id) return;

        const res = await axios.get(`http://127.0.0.1:5000/api/patients/${id}`);
        const data = res.data || {};

        const mapped = {
          firstName: data.first_name || "",
          lastName: data.last_name || "",
          email: data.email || "",
          dateOfBirth: data.date_of_birth || "",
          phoneNumber: data.phone_number || "",
          gender: data.gender || "",
        };

        setProfile(mapped);
        setFormData(mapped);
      } catch {}
    };

    fetchProfile();
  }, [patientId]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Save updated profile
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const id = patientId || localStorage.getItem("patientId");

      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        date_of_birth: formData.dateOfBirth,
        phone_number: formData.phoneNumber,
        gender: formData.gender,
      };

      const res = await axios.put(
        `http://127.0.0.1:5000/api/patients/${id}`,
        payload
      );

      const updated = {
        firstName: res.data.first_name,
        lastName: res.data.last_name,
        email: res.data.email,
        dateOfBirth: res.data.date_of_birth,
        phoneNumber: res.data.phone_number,
        gender: res.data.gender,
      };

      setProfile(updated);
      setFormData(updated);
      setIsEditing(false);
    } catch {}
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not provided";
    const d = new Date(dateString);
    return d.toLocaleDateString();
  };

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="profile-info">
            <h3>Profile Information</h3>

            {!isEditing ? (
              <div className="profile-details">
                <div className="profile-section">
                  <h4>Basic Information</h4>
                  <div className="info-group">
                    <p><strong>First Name:</strong> {profile.firstName}</p>
                    <p><strong>Last Name:</strong> {profile.lastName}</p>
                    <p><strong>Email:</strong> {profile.email}</p>
                    <p><strong>Date of Birth:</strong> {formatDate(profile.dateOfBirth)}</p>
                    <p><strong>Phone Number:</strong> {profile.phoneNumber || "Not provided"}</p>
                    <p><strong>Gender:</strong> {profile.gender || "Not provided"}</p>
                  </div>

                  <button className="edit-button" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </button>
                </div>
              </div>
            ) : (
              <form className="edit-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>First Name:</label>
                  <input name="firstName" value={formData.firstName} onChange={handleInputChange} />
                </div>

                <div className="form-group">
                  <label>Last Name:</label>
                  <input name="lastName" value={formData.lastName} onChange={handleInputChange} />
                </div>

                <div className="form-group">
                  <label>Email:</label>
                  <input name="email" value={formData.email} onChange={handleInputChange} />
                </div>

                <div className="form-group">
                  <label>Date of Birth:</label>
                  <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} />
                </div>

                <div className="form-group">
                  <label>Phone Number:</label>
                  <input name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} />
                </div>

                <div className="form-group">
                  <label>Gender:</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div className="button-group">
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        );

      case "appointments":
        return <AppointmentScheduler />;

      case "records":
        return <MedicalRecords />;

      case "prescriptions":
        return <Prescriptions />;

      case "billing":
        return <Billing />;

      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container with-navbar">
      <nav className="dashboard-nav">
        <h2>Patient Dashboard</h2>

        <div className="tabs">
          <button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>Profile</button>
          <button className={activeTab === "appointments" ? "active" : ""} onClick={() => setActiveTab("appointments")}>Appointments</button>
          <button className={activeTab === "records" ? "active" : ""} onClick={() => setActiveTab("records")}>Medical Records</button>
          <button className={activeTab === "prescriptions" ? "active" : ""} onClick={() => setActiveTab("prescriptions")}>Prescriptions</button>
          <button className={activeTab === "billing" ? "active" : ""} onClick={() => setActiveTab("billing")}>Billing</button>
        </div>
      </nav>

      <main className="dashboard-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default PatientProfile;
