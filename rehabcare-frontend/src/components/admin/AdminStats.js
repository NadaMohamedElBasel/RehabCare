// import React, { useEffect, useState } from "react";
// import axios from "axios";

// function AdminStats() {
//   const [stats, setStats] = useState({});

//   useEffect(() => {
//     axios
//       .get("http://localhost:5000/api/admin/dashboard")
//       .then((res) => setStats(res.data))
//       .catch((err) => console.error(err));
//   }, []);

//   return (
//     <div>
//       <h3>System Overview</h3>

//       <div className="stats-grid">
//         <div className="stat-card">
//           <h4>Total Doctors</h4>
//           <p>{stats.totalDoctors}</p>
//         </div>

//         <div className="stat-card">
//           <h4>Total Patients</h4>
//           <p>{stats.totalPatients}</p>
//         </div>

//         <div className="stat-card">
//           <h4>Total Appointments</h4>
//           <p>{stats.totalAppointments}</p>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default AdminStats;
import React from "react";
import { useParams } from "react-router-dom";
import "./AdminLayout.css";

function AdminDashboard() {
  const { adminId } = useParams();

  return (
    <div className="dashboard-container">
      <h2>Admin Dashboard</h2>

      <div className="dashboard-content">
        <div className="stat-card">
          ✅ <strong>Admin Dashboard is working</strong>
          <p>Admin ID: {adminId}</p>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
