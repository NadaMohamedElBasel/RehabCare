// src/layouts/DoctorLayout.js
import React from "react";
import "./DoctorLayout.css";

function DoctorLayout({ children }) {
  return (
    <div className="doctor-layout">

      {/* Main Content Only */}
      <main className="doctor-content">
        {children}
      </main>

    </div>
  );
}

export default DoctorLayout;
