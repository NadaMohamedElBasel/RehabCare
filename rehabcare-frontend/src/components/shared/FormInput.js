// src/components/shared/FormInput.js
import React from "react";
import "./FormInput.css";

function FormInput({ label, type = "text", name, value, onChange, placeholder }) {
  return (
    <div className="form-input-group">
      {label && <label>{label}</label>}
      <input 
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}

export default FormInput;
