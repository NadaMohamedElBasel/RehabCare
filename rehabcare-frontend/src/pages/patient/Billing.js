// // src/components/Billing.js
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { useParams } from 'react-router-dom';
// import './Billing.css';

// function Billing() {
//   const { patientId } = useParams();
//   const [bills, setBills] = useState([]);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     fetchBills();
//   }, [patientId]);

//   const fetchBills = async () => {
//     try {
//       const response = await axios.get(`http://localhost:5000/api/billing/${patientId}`);
//       setBills(response.data);
//     } catch (err) {
//       setError(err.response?.data?.error || 'Failed to fetch bills');
//     }
//   };

//   return (
//     <div>
//       <h2>Billing</h2>
//       {error && <p style={{ color: 'red' }}>{error}</p>}
//       <ul>
//         {bills.map((bill) => (
//           <li key={bill.billingId}>
//             ${bill.amount} - Due: {bill.dueDate} ({bill.status})
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// export default Billing;


import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './Billing.css';

function Billing() {
  const { patientId } = useParams();
  const [bills, setBills] = useState([]);
  const [error, setError] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState({});

  useEffect(() => {
    fetchBills();
  }, [patientId]);

  const fetchBills = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/billing/${patientId}`);
      setBills(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch bills');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'status-badge paid';
      case 'pending': return 'status-badge pending';
      case 'overdue': return 'status-badge overdue';
      case 'insurance_submitted': return 'status-badge insurance_submitted';
      default: return 'status-badge';
    }
  };
  const handlePaymentMethodChange = (billingId, method) => {
    setSelectedPaymentMethod(prev => ({
      ...prev,
      [billingId]: method
    }));
  };

  const handlePayNow = async (billingId, method) => {
    if (!method) {
      setError('Please select a payment method');
      return;
    }
    
    try {
      await axios.put(`http://localhost:5000/api/billing/${billingId}`, {
        status: 'paid',
        payment_method: method
      });
      fetchBills();
      setSelectedPaymentMethod(prev => ({ ...prev, [billingId]: '' }));
    } catch (err) {
      setError('Failed to process payment');
    }
  };

  return (
    <div className="billing-container">
      <h2>Billing History</h2>
      {error && <p className="error-message">{error}</p>}
      
      <div className="bills-grid">
        {bills.map((bill) => (
          // <div key={bill.billing_id} className="bill-card">
          //   <div className="bill-header">
          //     <span className="invoice-number">Invoice #{bill.invoice_id}</span>
          //     <span className={getStatusBadgeClass(bill.status)}>
          //       {bill.status}
          //     </span>
          //   </div>
            
          //   <div className="bill-details">
          //     <div className="amount-section">
          //       <h3>Amount</h3>
          //       <p className="amount">${bill.amount.toFixed(2)}</p>
          //       <p className="due-date">Due: {new Date(bill.due_date).toLocaleDateString()}</p>
          //     </div>

          //     <div className="insurance-section">
          //       <h4>Insurance Details</h4>
          //       <p><strong>Provider:</strong> {bill.insurance_provider}</p>
          //       <p><strong>Policy #:</strong> {bill.policy_number}</p>
          //       <p><strong>Coverage:</strong> {bill.coverage_percentage}%</p>
          //       <p><strong>Patient Responsibility:</strong> ${bill.patient_responsibility.toFixed(2)}</p>
          //     </div>

          //     {bill.status === 'PAID' && (
          //       <div className="payment-section">
          //         <h4>Payment Information</h4>
          //         <p><strong>Method:</strong> {bill.payment_method}</p>
          //         <p><strong>Date:</strong> {new Date(bill.payment_date).toLocaleDateString()}</p>
          //         <p><strong>Transaction ID:</strong> {bill.transaction_id}</p>
          //       </div>
          //     )}
          //   </div>

          //   {bill.status === 'PENDING' && (
          //     <div className="payment-actions">
          //       <button className="pay-button">Pay Now</button>
          //       <select className="payment-method-select">
          //         <option value="">Select Payment Method</option>
          //         <option value="CREDIT_CARD">Credit Card</option>
          //         <option value="DEBIT_CARD">Debit Card</option>
          //         <option value="CASH">Cash</option>
          //         <option value="INSURANCE">Insurance</option>
          //       </select>
          <div key={bill.billing_id} className="bill-card">
              <div className="bill-header">
                <span className="invoice-number">Invoice #{bill.billing_id}</span>
                <span className={getStatusBadgeClass(bill.status)}>
                  {bill.status?.toUpperCase() || 'PENDING'}
                </span>
              </div>
              
              <div className="bill-details">
                {/* Amount Section */}
                <div className="amount-section">
                  <h3>Amount</h3>
                  <p className="amount">${parseFloat(bill.amount).toFixed(2)}</p>
                  <p className="due-date">Due: {new Date(bill.due_date).toLocaleDateString()}</p>
                </div>

                {/* Medical Information */}
                <div className="medical-section">
                  <h4>Medical Information</h4>
                  {bill.icd10_code && <p><strong>ICD-10 Code:</strong> {bill.icd10_code}</p>}
                  {bill.appointment_id && <p><strong>Appointment ID:</strong> {bill.appointment_id}</p>}
                </div>

                {/* Insurance Details */}
                {bill.insurance_company && (
                  <div className="insurance-section">
                    <h4>Insurance Details</h4>
                    <p><strong>Insurance Company:</strong> {bill.insurance_company}</p>
                  </div>
                )}

                {/* Payment Information */}
                {bill.status?.toLowerCase() === 'paid' && (
                  <div className="payment-section">
                    <h4>Payment Information</h4>
                    <p><strong>Method:</strong> {bill.payment_method || 'Not specified'}</p>
                    <p><strong>Paid Date:</strong> {new Date(bill.created_at).toLocaleDateString()}</p>
                  </div>
                )}

                {/* Patient Information */}
                <div className="patient-section">
                  <h4>Patient Information</h4>
                  <p><strong>Name:</strong> {bill.first_name} {bill.last_name}</p>
                  <p><strong>Email:</strong> {bill.email}</p>
                </div>
              </div>

              {/* Payment Actions */}
              {bill.status?.toLowerCase() === 'pending' && (
                <div className="payment-actions">
                  <div className="payment-method-group">
                    <select 
                      className="payment-method-select"
                      value={selectedPaymentMethod[bill.billing_id] || ''}
                      onChange={(e) => handlePaymentMethodChange(bill.billing_id, e.target.value)}
                    >
                      <option value="">Select Payment Method</option>
                      <option value="CREDIT_CARD">Credit Card</option>
                      <option value="DEBIT_CARD">Debit Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CASH">Cash</option>
                      <option value="INSURANCE">Insurance</option>
                      <option value="CHECK">Check</option>
                    </select>
                  </div>
                  <button 
                    className="pay-button"
                    onClick={() => handlePayNow(bill.billing_id, selectedPaymentMethod[bill.billing_id])}
                  >
                    Pay Now
                  </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Billing;