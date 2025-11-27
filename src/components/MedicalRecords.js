// // src/components/MedicalRecords.js
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { useParams } from 'react-router-dom';
// import './MedicalRecords.css';

// function MedicalRecords() {
//   const { patientId } = useParams();
//   const [records, setRecords] = useState([]);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     fetchRecords();
//   }, [patientId]);

//   const fetchRecords = async () => {
//     try {
//       const response = await axios.get(`http://localhost:5000/api/medical-records/${patientId}`);
//       setRecords(response.data);
//     } catch (err) {
//       setError(err.response?.data?.error || 'Failed to fetch records');
//     }
//   };

//   return (
//     <div>
//       <h2>Medical Records</h2>
//       {error && <p style={{ color: 'red' }}>{error}</p>}
//       <ul>
//         {records.map((record) => (
//           <li key={record.recordId}>
//             {record.recordType} - {JSON.stringify(record.recordData)} ({record.createdAt})
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// export default MedicalRecords;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import './MedicalRecords.css';

function MedicalRecords() {
  const { patientId } = useParams();
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecords();
  }, [patientId]);

  const fetchRecords = async () => {
    try {
      const response = await axios.get(`http://127.0.0.1:5000/api/medical-records/${patientId}`);
      setRecords(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch records');
    }
  };

  const downloadFile = async (fileId, fileName) => {
    try {
      const response = await axios.get(
        `http://127.0.0.1:5000/api/medical-records/files/${fileId}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to download file');
    }
  };

  return (
    <div className="medical-records-container">
      <h2>Medical Records</h2>
      
      {error && <p className="error-message">{error}</p>}

      <div className="records-timeline">
        {records.length === 0 ? (
          <p className="no-records">No medical records available.</p>
        ) : (
          records.map((record) => (
            <div key={record.record_id} className="record-card">
              <div className="record-header">
                <h4>{record.record_type}</h4>
                <span className="record-date">
                  {record.visit_date || 'Date not specified'}
                </span>
              </div>
              {record.department && (
                <span className="department-badge">{record.department}</span>
              )}
              <div className="record-body">
                <p>{record.record_data}</p>
              </div>
              <div className="record-footer">
                <small>Created on: {record.created_at}</small>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MedicalRecords;