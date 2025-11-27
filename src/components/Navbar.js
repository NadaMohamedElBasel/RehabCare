// // src/components/Navbar.js
// import React from 'react';
// import { Link } from 'react-router-dom';
// import './Navbar.css';

// function Navbar() {
//   return (
//     <nav className="navbar">
//       <h2 className="navbar-brand">RehabCare Portal</h2>
//       <ul className="navbar-menu">
//         <li><Link to="/register">Register</Link></li>
//         <li><Link to="/profile/1">Profile</Link></li> {/* Example patientId */}
//         <li><Link to="/appointments/1">Appointments</Link></li>
//         <li><Link to="/records/1">Medical Records</Link></li>
//         <li><Link to="/prescriptions/1">Prescriptions</Link></li>
//         <li><Link to="/billing/1">Billing</Link></li>
//       </ul>
//     </nav>
//   );
// }

// export default Navbar;

// src/components/Navbar.js
import React from 'react';
import { Link , useParams} from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const { patientId } = useParams();  // Gets the ID from URL
  return (
    <nav className="navbar">
      <h2 className="navbar-brand">RehabCare Portal</h2>
      <ul className="navbar-menu">
        <li><Link to="/register">Register</Link></li>
        <li><Link to="/login">Login</Link></li>
        {/* Other modules can be added after login */}
      </ul>
    </nav>
  );
}

export default Navbar;