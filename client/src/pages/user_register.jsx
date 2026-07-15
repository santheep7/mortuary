import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config.js";
import AuthShell from "../components/auth/AuthShell";
import FormField from "../components/auth/FormField";
import StatusBanner from "../components/auth/StatusBanner";

const USER_ICON = "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z";

const DEPARTMENTS = ["House Keeping", "M Staff"];

const initialForm = {
  fullName: "",
  employeeId: "",
  department: "",
  phone1: "",
  phone2: "",
  email: "",
  password: "",
};

// Format phone number with hyphens: XXX-XXX-XXXX
const formatPhoneNumber = (value) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};

function validate(fields) {
  const errors = {};
  if (!fields.fullName.trim()) errors.fullName = "Full name is required.";
  if (!fields.employeeId.trim()) {
    errors.employeeId = "Employee ID is required.";
  } else if (!/^[A-Za-z0-9]+$/.test(fields.employeeId.trim())) {
    errors.employeeId = "Employee ID must be alphanumeric.";
  }
  if (!fields.department) errors.department = "Please select a department.";
  const phoneRegex = /^[6-9]\d{9}$/;
  const phone1Clean = fields.phone1.replace(/\D/g, '');
  const phone2Clean = fields.phone2.replace(/\D/g, '');
  if (!phone1Clean) {
    errors.phone1 = "Phone number is required.";
  } else if (!phoneRegex.test(phone1Clean)) {
    errors.phone1 = "Enter a valid 10-digit phone number.";
  }
  if (phone2Clean && !phoneRegex.test(phone2Clean)) {
    errors.phone2 = "Enter a valid 10-digit phone number.";
  }
  if (!fields.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!fields.password || fields.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  return errors;
}

function ApprovalModal({ onGoToLogin }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-fade-in">
        <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center border-4 border-amber-200">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm text-amber-800 font-semibold mb-1 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Pending Admin Approval
          </p>
          <p className="text-sm text-amber-700">
            Your registration has been received. You <strong>cannot log in</strong> until an admin approves your account.
            Please contact the system administrator.
          </p>
        </div>

        <button
          onClick={onGoToLogin}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white
            bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const processedValue = (name === 'phone1' || name === 'phone2') ? formatPhoneNumber(value) : value;
    setForm(prev => ({ ...prev, [name]: processedValue }));
    setErrors(prev => ({ ...prev, [name]: "" }));
    setSubmitError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    setSubmitError("");
    try {
      const payload = {
        fullname: form.fullName.trim(),
        employee_id: form.employeeId.trim(),
        department: form.department,
        phone1: form.phone1.trim(),
        phone2: form.phone2.trim() || "",
        email: form.email.trim(),
        password: form.password,
      };

      const res = await fetch(`${API_BASE}/user_register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        setForm(initialForm);
        setErrors({});
        setShowSuccessModal(true);
      } else {
        setSubmitError(data.message || "Registration failed. Please try again.");
      }
    } catch {
      setSubmitError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showSuccessModal && <ApprovalModal onGoToLogin={() => navigate("/")} />}

      <AuthShell iconPath={USER_ICON} title="Create Staff Account" subtitle="Register for access — subject to admin approval" portalLabel="Staff Portal">
        <StatusBanner type="error" message={submitError} />

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormField label="Full Name" name="fullName" value={form.fullName} onChange={handleChange}
            error={errors.fullName} placeholder="e.g. John Mathew" />

          <FormField label="Employee ID" name="employeeId" value={form.employeeId} onChange={handleChange}
            error={errors.employeeId} placeholder="e.g. EMP001" />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              name="department"
              value={form.department}
              onChange={handleChange}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white text-gray-900
                outline-none transition-all
                focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500
                ${errors.department ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"}`}
            >
              <option value="">Select Department</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.department && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">{errors.department}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Phone (Primary)" name="phone1" value={form.phone1} onChange={handleChange}
              error={errors.phone1} placeholder="e.g. 9876543210" />
            <FormField label="Phone (Secondary)" name="phone2" value={form.phone2} onChange={handleChange}
              error={errors.phone2} placeholder="Optional" required={false} />
          </div>

          <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange}
            error={errors.email} placeholder="e.g. john@hospital.in" />

          <FormField label="Password" name="password" value={form.password} onChange={handleChange}
            error={errors.password} placeholder="Min. 8 characters" autoComplete="new-password" isPassword />

          <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-700">
            <svg className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>After registration, your account will be <strong>reviewed by an admin</strong> before you can log in.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white
              bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]
              transition-all shadow-md shadow-indigo-200
              disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2 mt-2"
          >
            {loading ? "Submitting..." : "Submit Registration"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400 font-medium">Already registered?</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <a href="/"
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg
            border border-gray-200 text-sm font-medium text-gray-600
            bg-white hover:bg-gray-50 hover:border-gray-300 transition-all">
          Sign In Instead
        </a>
      </AuthShell>
    </>
  );
}
