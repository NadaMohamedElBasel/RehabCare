import React from "react";
import "./Card.css";

function BillCard({ bill }) {
  return (
    <div className="card">
      <h3>Invoice #{bill.billing_id}</h3>
      <p><strong>Amount:</strong> ${bill.amount}</p>
      <p><strong>Status:</strong> {bill.status}</p>
      <p><strong>Due Date:</strong> {bill.due_date}</p>
    </div>
  );
}

export default BillCard;
