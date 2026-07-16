import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config.js";
import AuthShell from "../components/auth/AuthShell";
import FormField from "../components/auth/FormField";
import StatusBanner from "../components/auth/StatusBanner";

const SHIELD_ICON = "M9 12.75L11.25 15 15 9.75M21 12c0 4.556-3.03 8.25-8.25 9.75C7.53 20.25 4.5 16.556 4.5 12V6.31c0-.51.325-.962.808-1.13a48.99 48.99 0 0111.384 0c.483.168.808.62.808 1.13V12z";
const USER_ICON = "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0";
const LOCK_ICON = "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z";
const MAIL_ICON = "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z";
const BUILDING_ICON = "M3 21h18M5 21V7l8-4v18M13 21V11l6 4v6M9 9h.01M9 12h.01M9 15h.01";

// Same scoring used on the staff registration form, kept in sync deliberately
function getPasswordStrength(password) {
  let strength = 0;
  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  if (/[a-z]/.test(password)) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 1;

  if (strength <= 2) return { level: 'weak', score: strength, max: 6 };
  if (strength <= 4) return { level: 'medium', score: strength, max: 6 };
  return { level: 'strong', score: strength, max: 6 };
}

function AdminRegister() {
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "", clientId: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  // usernameStatus: 'idle' | 'checking' | 'available' | 'taken' | 'error'
  const [usernameStatus, setUsernameStatus] = useState("idle");
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  // Debounced live check - waits 500ms after typing stops, then asks the
  // server. requestIdRef guards against an older, slower request landing
  // after a newer one and overwriting a more current result.
  useEffect(() => {
    const username = form.username.trim();
    if (!username) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");
    const thisRequestId = ++requestIdRef.current;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/check-username/${encodeURIComponent(username)}`);
        const data = await res.json();
        if (thisRequestId !== requestIdRef.current) return; // stale response, ignore
        if (!res.ok) {
          setUsernameStatus("error");
          return;
        }
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        if (thisRequestId === requestIdRef.current) setUsernameStatus("error");
      }
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [form.username]);

  const passwordStrength = form.password ? getPasswordStrength(form.password) : null;

  const validate = () => {
    if (!form.username) return "Username is required";
    if (usernameStatus === "taken") return "That username is already taken";
    if (!form.clientId) return "Client ID is required";
    if (!form.password) return "Password is required";
    if (form.password.length < 6) return "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API_BASE}/admin/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          client_id: form.clientId,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
        return;
      }

      setSuccess("Admin registered successfully! Redirecting to login...");
      setTimeout(() => navigate("/admin-login"), 2000);
    } catch (err) {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell iconPath={SHIELD_ICON} title="Create Admin Account" subtitle="Register to manage cabins, billing & staff" portalLabel="Admin Portal">
      <StatusBanner type="error" message={error} />
      <StatusBanner type="success" message={success} />

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormField label="Username" name="username" value={form.username} onChange={handleChange}
          placeholder="Choose a username" autoComplete="username" iconPath={USER_ICON} />

        <FormField label="Client ID" name="clientId" value={form.clientId} onChange={handleChange}
          placeholder="Your hospital's Client ID" autoComplete="off" iconPath={BUILDING_ICON} />

        <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange}
          placeholder="Enter email" autoComplete="email" iconPath={MAIL_ICON} required={false} />

        <FormField label="Password" name="password" value={form.password} onChange={handleChange}
          placeholder="Min. 6 characters" autoComplete="new-password" iconPath={LOCK_ICON} isPassword />

        <FormField label="Confirm Password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
          placeholder="Re-enter password" autoComplete="new-password" iconPath={LOCK_ICON} isPassword />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white
            bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]
            transition-all shadow-md shadow-indigo-200
            disabled:opacity-60 disabled:cursor-not-allowed
            flex items-center justify-center gap-2 mt-2"
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400 font-medium">Already have an account?</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      <a href="/admin-login"
        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg
          border border-gray-200 text-sm font-medium text-gray-600
          bg-white hover:bg-gray-50 hover:border-gray-300 transition-all">
        Sign In Instead
      </a>
    </AuthShell>
  );
}

export default AdminRegister;