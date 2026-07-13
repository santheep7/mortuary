import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo1 from './images/logo1.png';
import { API_BASE } from '../config.js';

function SuperAdminLogin() {
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.username || !form.password) {
      setError("Username and password required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/superadmin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      console.log('SuperAdmin login response:', data);

      if (!res.ok) {
        setError(data.message || "Invalid credentials");
        return;
      }

      // Save superadmin session
      localStorage.setItem('role', 'SuperAdmin');
      localStorage.setItem("admin", JSON.stringify(data.user));
      console.log('Session saved, redirecting to /dashboard/superadmin-dashboard');

      // Clear loading before navigation
      setLoading(false);

      // Redirect
      navigate("/dashboard/superadmin-dashboard");

    } catch (err) {
      console.error('Login error:', err);
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">

        <h2 className="text-2xl font-bold text-center mb-6 text-purple-700">SuperAdmin Login</h2>

        {error && (
          <div className="bg-red-100 text-red-600 p-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              className="w-full border border-gray-300 px-3 py-2 rounded mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter superadmin username"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full border border-gray-300 px-3 py-2 rounded mt-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? "Logging in..." : "Login as SuperAdmin"}
          </button>

        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate("/admin-login")}
            className="text-sm text-purple-600 hover:text-purple-800"
          >
            Back to Admin Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminLogin;
