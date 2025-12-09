// src/components/shared/ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, role }) {
  const userRole = localStorage.getItem("role");

  if (!userRole) return <Navigate to="/login" replace />;

  if (role && userRole !== role) return <Navigate to="/unauthorized" replace />;

  return children;
}

export default ProtectedRoute;
