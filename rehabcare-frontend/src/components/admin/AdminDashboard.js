// import React, { useState } from "react";
// import { useParams } from "react-router-dom";
// import "./AdminLayout.css";

// import AdminStats from "./AdminStats";
// import AdminDoctors from "./AdminDoctors";
// import AdminBilling from "./AdminBilling";

// function AdminDashboard() {
//   const { adminId } = useParams();
//   const [activeTab, setActiveTab] = useState("stats");

//   const renderContent = () => {
//     switch (activeTab) {
//       case "stats":
//         return <AdminStats />;
//       case "doctors":
//         return <AdminDoctors />;
//       case "billing":
//         return <AdminBilling />;
//       default:
//         return null;
//     }
//   };

//   return (
//     <div className="dashboard-container">
//       <nav className="dashboard-nav">
//         <h2>Admin Dashboard</h2>

//         <div className="tabs">
//           <button
//             className={activeTab === "stats" ? "active" : ""}
//             onClick={() => setActiveTab("stats")}
//           >
//             Dashboard
//           </button>

//           <button
//             className={activeTab === "doctors" ? "active" : ""}
//             onClick={() => setActiveTab("doctors")}
//           >
//             Doctors
//           </button>

//           <button
//             className={activeTab === "billing" ? "active" : ""}
//             onClick={() => setActiveTab("billing")}
//           >
//             Billing
//           </button>
//         </div>
//       </nav>

//       <main className="dashboard-content">
//         {renderContent()}
//       </main>
//     </div>
//   );
// }

// export default AdminDashboard;

import React, { useState } from "react";
import { useParams } from "react-router-dom";
import "./AdminLayout.css";

import AdminStats from "./AdminStats";
import DoctorManager from "./DoctorManager";
import BillingManager from "./BillingManager";


function AdminDashboard() {
  const { adminId } = useParams();
  const [activeTab, setActiveTab] = useState("stats");

  const renderContent = () => {
    switch (activeTab) {
      case "stats":
        return <AdminStats />;

      case "doctors":
          return <DoctorManager adminId={adminId} />;

      case "billing":
        return <BillingManager adminId={adminId} />;


      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>Admin Dashboard</h2>

        <div className="tabs">
          <button
            className={activeTab === "stats" ? "active" : ""}
            onClick={() => setActiveTab("stats")}
          >
            Dashboard
          </button>

          <button
            className={activeTab === "doctors" ? "active" : ""}
            onClick={() => setActiveTab("doctors")}
          >
            Doctors
          </button>

          <button
            className={activeTab === "billing" ? "active" : ""}
            onClick={() => setActiveTab("billing")}
          >
            Billing
          </button>
        </div>
      </nav>

      <main className="dashboard-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default AdminDashboard;
