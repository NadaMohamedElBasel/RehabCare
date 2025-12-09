// src/pages/admin/ManageUsers.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Admin.css";

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "PATIENT"
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Fetch users error", err);
    }
  };

  const handleInput = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`http://localhost:5000/api/users/${editingId}`, {
          username: formData.username,
          email: formData.email,
          role: formData.role
        });
      } else {
        await axios.post("http://localhost:5000/api/users", formData);
      }
      setFormData({ username: "", email: "", password: "", role: "PATIENT" });
      setEditingId(null);
      fetchUsers();
    } catch (err) {
      console.error("Save user error", err);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/users/${id}`);
      fetchUsers();
    } catch (err) {
      console.error("Delete user error", err);
    }
  };

  return (
    <div className="admin-section">
      <h2>Manage Users</h2>

      <form onSubmit={handleSubmit} className="admin-form">
        <input
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleInput}
          required
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleInput}
          required
        />
        {!editingId && (
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleInput}
            required
          />
        )}
        <select name="role" value={formData.role} onChange={handleInput}>
          <option value="ADMIN">ADMIN</option>
          <option value="DOCTOR">DOCTOR</option>
          <option value="PATIENT">PATIENT</option>
        </select>

        <button type="submit">
          {editingId ? "Update User" : "Add User"}
        </button>
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.user_id}>
              <td>{u.username}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.user_id}</td>
              <td>
                <button
                  className="btn-edit"
                  onClick={() => {
                    setEditingId(u.user_id);
                    setFormData({
                      username: u.username,
                      email: u.email,
                      password: "",
                      role: u.role
                    });
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn-delete"
                  onClick={() => deleteUser(u.user_id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ManageUsers;
