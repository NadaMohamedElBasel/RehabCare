// src/components/AdminBilling.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminBilling.css';

// Mock ICD-10 Codes
const ICD10_CODES = [
  // --- MUSCULOSKELETAL & ORTHOPEDIC ---
  { code: 'M54.5', description: 'Low back pain (Lumbalgia)' },
  { code: 'M54.2', description: 'Cervicalgia (Neck pain)' },
  { code: 'M54.41', description: 'Lumbago with sciatica, right side' },
  { code: 'M25.511', description: 'Pain in right shoulder joint' },
  { code: 'M25.561', description: 'Pain in right knee' },
  { code: 'M75.10', description: 'Unspecified rotator cuff tear/rupture, unspecified shoulder' },
  { code: 'M76.60', description: 'Achilles tendinitis, unspecified leg' },
  { code: 'S93.409A', description: 'Unspecified sprain of ankle, initial encounter' },

  // --- NEUROLOGICAL ---
  { code: 'I69.351', description: 'Hemiplegia/hemiparesis following cerebral infarction (Stroke)' },
  { code: 'G35', description: 'Multiple sclerosis' },
  { code: 'G20', description: 'Parkinson’s disease' },
  { code: 'I69.32', description: 'Aphasia (language impairment)' },
  { code: 'R47.1', description: 'Dysarthria (motor speech disorder)' },
  { code: 'R13.10', description: 'Dysphagia (difficulty swallowing)' },

  // --- GENERAL MOBILITY & AFTERCARE ---
  { code: 'M62.81', description: 'Muscle weakness (Generalized debility)' },
  { code: 'R26.2', description: 'Difficulty in walking, not elsewhere classified (Gait abnormality)' },
  { code: 'R26.81', description: 'Unsteadiness on feet (Balance issue)' },
  { code: 'Z47.1', description: 'Aftercare following joint replacement surgery' },
  { code: 'I25.10', description: 'Chronic ischemic heart disease (for Cardiac Rehab)' },
  { code: 'J44.9', description: 'Chronic Obstructive Pulmonary Disease (COPD) (for Pulmonary Rehab)' },
];

const BILL_STATUSES = ['pending', 'paid', 'overdue', 'insurance_submitted', 'canceled'];

function AdminBilling() {
  const [bills, setBills] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // STATE FOR BILL CREATION FORM (CRITICAL FOR RESTORING BILL CREATION)
  const [formData, setFormData] = useState({
    patientId: '',
    amount: '',
    dueDate: '',
    icd10Code: ICD10_CODES[0].code,
  });
  const [isFormVisible, setIsFormVisible] = useState(false);

  useEffect(() => {
    fetchAllBills();
  }, []);

  const fetchAllBills = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/billing/all');
      setBills(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch all bills');
    }
  };

  // RESTORED: handleCreateBill function
  const handleCreateBill = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.post('http://localhost:5000/api/billing', {
        ...formData,
        amount: parseFloat(formData.amount),
        icd10_code: formData.icd10Code
      });
      setSuccess('Bill generated successfully!');
      // Reset form fields after successful creation
      setFormData({ patientId: '', amount: '', dueDate: '', icd10Code: ICD10_CODES[0].code });
      fetchAllBills();
      setIsFormVisible(false);
    } catch (err) {
      // This will catch missing fields/non-existent patient ID errors from the backend
      setError(err.response?.data?.error || 'Failed to generate bill');
    }
  };

  // SIMPLIFIED: Status update logic (no confirmation prompt)
  const handleStatusChange = async (billingId, newStatus) => {
    setError('');
    setSuccess('');

    let updateData = { status: newStatus };
    let updateMessage = `Bill ${billingId} status updated to ${newStatus.toUpperCase()}.`;

    if (newStatus === 'paid') {
      updateData.payment_method = 'MANUAL_ADMIN_ENTRY';
      updateMessage = `Bill ${billingId} marked as PAID (Manual Admin Entry).`;
    }

    try {
        await axios.put(`http://localhost:5000/api/billing/${billingId}`, updateData);
        setSuccess(updateMessage);
        fetchAllBills();
    } catch (err) {
        setError(err.response?.data?.error || `Failed to update bill ${billingId} status.`);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'status-badge paid';
      case 'pending': return 'status-badge pending';
      case 'overdue': return 'status-badge overdue';
      case 'insurance_submitted': return 'status-badge insurance';
      case 'canceled': return 'status-badge canceled';
      default: return 'status-badge';
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };


  return (
    <div className="admin-billing-container">
      <h2>Billing Manager (Admin)</h2>

      {/* TOGGLE BUTTON FOR BILL CREATION */}
      <button
        className="toggle-form-btn"
        onClick={() => setIsFormVisible(!isFormVisible)}
      >
        {isFormVisible ? 'Hide Bill Creation Form' : 'Generate New Bill'}
      </button>

      {/* BILL CREATION FORM (CONDITIONAL RENDERING) */}
      {isFormVisible && (
        <form onSubmit={handleCreateBill} className="bill-creation-form">
          <h3>Create Bill</h3>
          {success && <p className="success-message">{success}</p>}
          <div className="form-group">
            <label>Patient ID</label>
            <input
              type="number"
              name="patientId"
              value={formData.patientId}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Amount Due ($)</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              required
            />
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>ICD-10 Code</label>
            <select
              name="icd10Code"
              value={formData.icd10Code}
              onChange={handleChange}
              required
            >
              {ICD10_CODES.map((code) => (
                <option key={code.code} value={code.code}>
                  {code.code} - {code.description}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="submit-bill-btn">Generate Bill</button>
        </form>
      )}

      <hr className="divider" />

      {/* Bill List with Status Dropdown */}
      <h3>All Bills</h3>
      {error && <p className="error-message">{error}</p>}

      <div className="bill-list">
        {bills.length === 0 ? (
          <p>No bills found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Bill ID</th>
                <th>Patient Name</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>ICD-10 Code</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.billing_id} className={`status-${bill.status?.toLowerCase()}`}>
                  <td>{bill.billing_id}</td>
                  <td>{bill.first_name} {bill.last_name}</td>
                  <td>${parseFloat(bill.amount).toFixed(2)}</td>
                  <td>{bill.due_date}</td>
                  <td>{bill.icd10_code || 'N/A'}</td>

                  {/* Status Dropdown */}
                  <td>
                    <select
                      value={bill.status.toLowerCase()}
                      onChange={(e) => handleStatusChange(bill.billing_id, e.target.value)}
                      className={getStatusBadgeClass(bill.status)}
                    >
                      {BILL_STATUSES.map(status => (
                        <option key={status} value={status}>
                          {status.toUpperCase().replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AdminBilling;