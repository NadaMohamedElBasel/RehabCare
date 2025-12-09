// src/pages/admin/ManageBilling.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Admin.css";

function ManageBilling() {
  const [bills, setBills] = useState([]);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/billing");
      setBills(res.data);
    } catch (err) {
      console.error("Fetch billing error", err);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`http://localhost:5000/api/billing/${id}`, { status });
      fetchBills();
    } catch (err) {
      console.error("Update billing status error", err);
    }
  };

  return (
    <div className="admin-section">
      <h2>Manage Billing</h2>

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Patient</th>
            <th>Amount</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Payment Method</th>
            <th>Insurance</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((b) => (
            <tr key={b.billing_id}>
              <td>{b.billing_id}</td>
              <td>{b.patient_name || b.patient_id}</td>
              <td>{b.amount}</td>
              <td>{b.due_date}</td>
              <td>{b.status}</td>
              <td>{b.payment_method}</td>
              <td>{b.insurance_company}</td>
              <td>
                <select
                  value={b.status || ""}
                  onChange={(e) =>
                    updateStatus(b.billing_id, e.target.value)
                  }
                >
                  <option value="">Change</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ManageBilling;
