import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config.js";
import AuthShell from "../components/auth/AuthShell";
import FormField from "../components/auth/FormField";
import StatusBanner from "../components/auth/StatusBanner";

const LOCK_ICON = "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z";
const USER_ICON = "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0";

const initialForm = { employeeId: "", password: "" };

function validate(fields) {
  const errors = {};
  if (!fields.employeeId.trim()) {
    errors.employeeId = "Employee ID is required.";
  } else if (!/^[A-Za-z0-9]+$/.test(fields.employeeId)) {
    errors.employeeId = "Employee ID must be alphanumeric.";
  }
  if (!fields.password) {
    errors.password = "Password is required.";
  } else if (fields.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  return errors;
}

export default function Login() {
  const navigation = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    setSubmitStatus(null);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitStatus({ type: "success", message: data.message || "Login successful! Redirecting..." });
        localStorage.setItem("username", data.user.fullname);
        localStorage.setItem("role", data.user.role);

        if (data.user.role === "House Keeping") {
          navigation("/dashboard/housekeeping");
        } else if (data.user.role === "M Staff") {
          navigation("/dashboard/dashboard");
        }
      } else {
        setSubmitStatus({ type: "error", message: data.message || "Invalid credentials. Please try again." });
      }
    } catch {
      setSubmitStatus({ type: "error", message: "Network error. Please check your connection." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell iconPath={LOCK_ICON} title="Welcome Back" subtitle="Sign in to your staff account" portalLabel="Staff Portal">
      <StatusBanner type={submitStatus?.type} message={submitStatus?.message} />

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormField label="Employee ID" name="employeeId" value={form.employeeId} onChange={handleChange}
          error={errors.employeeId} placeholder="e.g. EMP001" autoComplete="username" iconPath={USER_ICON} />

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">
              Password <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              onClick={() => alert("Forgot password flow — implement as needed.")}
            >
              Forgot password?
            </button>
          </div>
          <FormField label="" name="password" value={form.password} onChange={handleChange}
            error={errors.password} placeholder="Enter your password" autoComplete="current-password"
            iconPath={LOCK_ICON} isPassword required={false} />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none group">
          <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
          <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
            Remember me on this device
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white
            bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]
            transition-all shadow-md shadow-indigo-200
            disabled:opacity-60 disabled:cursor-not-allowed
            flex items-center justify-center gap-2 mt-2"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400 font-medium">New staff member?</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      <a href="/signup"
        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg
          border border-gray-200 text-sm font-medium text-gray-600
          bg-white hover:bg-gray-50 hover:border-gray-300 transition-all">
        Create an account
      </a>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Need Help Getting Started?</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a href="/user-guide"
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg
            border border-indigo-100 text-xs font-semibold text-indigo-600
            bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-200 transition-all text-center">
          Open User Guide
        </a>
        <a href="/user-guide?watch=true"
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg
            border border-rose-100 text-xs font-semibold text-rose-600
            bg-rose-50/50 hover:bg-rose-50 hover:border-rose-200 transition-all text-center">
          Watch Tutorial
        </a>
      </div>
    </AuthShell>
  );
}
