// // src/components/Prescriptions.js
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { useParams } from 'react-router-dom';
// import './Prescriptions.css';

// function Prescriptions() {
//   const { patientId } = useParams();
//   const [prescriptions, setPrescriptions] = useState([]);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     fetchPrescriptions();
//   }, [patientId]);

//   const fetchPrescriptions = async () => {
//     try {
//       const response = await axios.get(`http://localhost:5000/api/prescriptions/${patientId}`);
//       setPrescriptions(response.data);
//     } catch (err) {
//       setError(err.response?.data?.error || 'Failed to fetch prescriptions');
//     }
//   };

//   return (
//     <div>
//       <h2>Prescriptions</h2>
//       {error && <p style={{ color: 'red' }}>{error}</p>}
//       <ul>
//         {prescriptions.map((prescription) => (
//           <li key={prescription.prescriptionId}>
//             {prescription.medicationName} - {prescription.dosage} ({prescription.instructions})
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// export default Prescriptions;


import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './Prescriptions.css';

function Prescriptions() {
  const { patientId } = useParams();
  const [medications, setMedications] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPrescriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const fetchPrescriptions = async () => {
    try {
      setError('');
      const response = await axios.get(`http://localhost:5000/api/prescriptions/${patientId}`);
      setMedications(response.data.medications || []);
      setExercises(response.data.exercises || []);
    } catch (err) {
      console.error('Failed to fetch prescriptions', err);
      setError(err.response?.data?.error || 'Failed to fetch prescriptions');
    }
  };

  const updateStatus = async (prescriptionId, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/prescriptions/${prescriptionId}`, {
        status: newStatus
      });
      // Refresh prescriptions after update
      fetchPrescriptions();
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'status-badge completed';
      case 'ongoing': return 'status-badge ongoing';
      case 'not-started': return 'status-badge not-started';
      case 'active': return 'status-badge ongoing';
      case 'inactive': return 'status-badge not-started';
      default: return 'status-badge';
    }
  };

  return (
    <div className="treatment-plan-container">
      <h2>Treatment Plan</h2>
      
      {/* Medications Section */}
      <section className="plan-section">
        <h3>Prescribed Medications</h3>
        <div className="cards-container">
          {medications.map((med) => (
            <div key={med.prescription_id} className="prescription-card">
                <div className="card-header">
                  <h4>{med.medication_name}</h4>
                  <span className={getStatusBadgeClass(med.status)}>
                    {med.status || 'pending'}
                  </span>
                </div>
                <div className="card-body">
                  <p><strong>Dosage:</strong> {med.dosage}</p>
                  <p><strong>Frequency:</strong> {med.frequency}</p>
                  <p><strong>Duration:</strong> {med.duration}</p>
                  <p><strong>Issued Date:</strong> {med.issued_date}</p>
                  <p><strong>Instructions:</strong> {med.instructions}</p>
                </div>
                <div className="progress-controls">
                  <select 
                    value={med.status || 'pending'} 
                    onChange={(e) => updateStatus(med.prescription_id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Exercises Section */}
      <section className="plan-section">
        <h3>Prescribed Exercises</h3>
        <div className="cards-container">
          {exercises.map((exercise) => (
            <div key={exercise.prescription_id} className="prescription-card">
                <div className="card-header">
                  <h4>{exercise.medication_name}</h4>
                  <span className={getStatusBadgeClass(exercise.status)}>
                    {exercise.status || 'pending'}
                  </span>
                </div>
                <div className="card-body">
                  <p><strong>Frequency:</strong> {exercise.frequency}</p>
                  <p><strong>Duration:</strong> {exercise.duration}</p>
                  <p><strong>Issued Date:</strong> {exercise.issued_date}</p>
                  <p><strong>Instructions:</strong> {exercise.instructions}</p>
                  {exercise.dosage && <p><strong>Sets/Reps:</strong> {exercise.dosage}</p>}
                </div>
                <div className="progress-controls">
                  <select 
                    value={exercise.status || 'pending'} 
                    onChange={(e) => updateStatus(exercise.prescription_id, e.target.value)}
                  >
                    <option value="pending">Not Started</option>
                    <option value="active">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default Prescriptions;