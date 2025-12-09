// src/layouts/PatientLayout.js
import React from "react";
import "./PatientLayout.css";

function PatientLayout({ children }) {
  return (
    <div className="patient-layout">

      {/* Main Content Only */}
      <main className="patient-content">
        {children}
      </main>

    </div>
  );
}

export default PatientLayout;
