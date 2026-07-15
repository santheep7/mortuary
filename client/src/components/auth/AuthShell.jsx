import { useLocation, useNavigate } from "react-router-dom";
import logo from "../../pages/images/logo1.png";

export default function AuthShell({ children, onToggle, isLogin }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex min-h-[520px]">

        {/* ── Left panel ── */}
        <div
          className="hidden md:flex flex-col justify-between w-5/12 p-10 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 60%, #818cf8 100%)" }}
        >
          {/* subtle circle decorations */}
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/10" />
          <div className="absolute top-24 -right-20 w-72 h-72 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 left-10 w-56 h-56 rounded-full bg-white/10" />

          {/* Authorized badge */}
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-white/80 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Authorized Portal
            </span>
          </div>

          {/* Logo card */}
          <div className="relative z-10 flex flex-col items-center justify-center flex-1 py-6">
            <div className="w-28 h-28 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/30">
              <img src={logo} alt="MOSC Logo" className="w-20 h-20 object-contain" />
            </div>
            <p className="mt-4 text-white/70 text-xs font-semibold tracking-widest uppercase">
              MOSC Medical College
            </p>
          </div>

          {/* Bottom tagline */}
          <div className="relative z-10">
            <h2 className="text-white text-2xl font-bold leading-snug">
              Welcome to<br />Mortuary System
            </h2>
            <p className="text-white/60 text-sm mt-2">
              Securely manage mortuary records and operations.
            </p>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 flex flex-col justify-center px-8 py-10 md:px-12 overflow-y-auto">
          {/* Sign in / Sign up toggle */}
          {onToggle && (
            <div className="flex justify-center mb-8">
              <div className="bg-gray-100 rounded-full p-1 flex gap-1">
                <button
                  onClick={() => onToggle(true)}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                    isLogin
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Sign in
                </button>
                <button
                  onClick={() => onToggle(false)}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                    !isLogin
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Sign up
                </button>
              </div>
            </div>
          )}
          {/* Page content */}
          {children}
        </div>
      </div>
    </div>
  );
}
