// src/pages/admin/Settings.js
import React, { useState } from "react";
import "./Admin.css";

function Settings() {
  const [settings, setSettings] = useState({
    clinicName: "RehabCare Center",
    contactEmail: "admin@rehabcare.local",
    timezone: "UTC",
    allowOnlineBooking: true
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    // TODO: send to backend endpoint, e.g. /api/admin/settings
    console.log("Saving settings:", settings);
    alert("Settings saved (demo only, wire to backend).");
  };

  return (
    <div className="admin-section">
      <h2>System Settings</h2>

      <form className="admin-form" onSubmit={handleSave}>
        <input
          name="clinicName"
          placeholder="Clinic Name"
          value={settings.clinicName}
          onChange={handleChange}
        />
        <input
          name="contactEmail"
          type="email"
          placeholder="Contact Email"
          value={settings.contactEmail}
          onChange={handleChange}
        />
        <select
          name="timezone"
          value={settings.timezone}
          onChange={handleChange}
        >
          <option value="UTC">UTC</option>
          <option value="Africa/Cairo">Africa/Cairo</option>
          <option value="Asia/Riyadh">Asia/Riyadh</option>
        </select>

        <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <input
            type="checkbox"
            name="allowOnlineBooking"
            checked={settings.allowOnlineBooking}
            onChange={handleChange}
          />
          Allow online patient booking
        </label>

        <button type="submit">Save Settings</button>
      </form>
    </div>
  );
}

export default Settings;
