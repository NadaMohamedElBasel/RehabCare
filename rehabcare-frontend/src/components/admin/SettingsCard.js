import React from "react";
import "./Card.css";

function SettingsCard({ setting }) {
  return (
    <div className="card">
      <h3>{setting.title}</h3>
      <p>{setting.description}</p>
    </div>
  );
}

export default SettingsCard;
