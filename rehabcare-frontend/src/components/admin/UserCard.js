import React from "react";
import "./Card.css";

function UserCard({ user }) {
  return (
    <div className="card">
      <h3>{user.username}</h3>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Role:</strong> {user.role}</p>
    </div>
  );
}

export default UserCard;
