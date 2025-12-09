// src/components/shared/Modal.js
import React from "react";
import "./Modal.css";

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h4>{title}</h4>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
