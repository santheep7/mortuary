import { Outlet } from "react-router-dom";
import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useMortuaryName } from '../context/MortuaryNameContext.jsx';
import { getUploadUrl } from '../config.js';
import {
  LayoutDashboard,
  Users,
  Bed,
  UserPlus,
  Receipt,
  LogOut,
  FileText,
  Settings,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle,
  List,
  ClipboardCheck,
  Tag,
  History,
  UserCheck,
  Menu,
  X
} from 'lucide-react';

export default function Dashboard_Base() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = localStorage.getItem("role");
  const admin = localStorage.getItem("admin");
  const { mortuaryName, mortuaryLogo } = useMortuaryName();

  const navigotor = useNavigate();
  let navItems = [];

  const handleLogout = () => {
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    navigotor("/");
  };

  if (role != "House Keeping" && role != "Admin" && role != "SuperAdmin") {
    navItems = [
      { path: '/dashboard/body-registration', icon: UserPlus, label: 'Body Registration' },
      { path: '/dashboard/cabin-allocation', icon: Bed, label: 'Cabin Allocation' },
      { path: '/dashboard/body-release', icon: LogOut, label: 'Body Release' },
      { path: '/dashboard/billing', icon: Receipt, label: 'Billing' },
      { path: '/dashboard/release-history', icon: History, label: 'Release History' },
      { path: '/dashboard/housekeeping', icon: ClipboardCheck, label: 'Housekeeping' },
    ];
  }
  else if (role === "SuperAdmin") {
    navItems = [
      { path: '/dashboard/superadmin-dashboard', icon: LayoutDashboard, label: 'SuperAdmin Dashboard' },
      { path: '/dashboard/user-approvals',  icon: UserCheck,        label: 'User Approvals' },
      { path: '/dashboard/cabin-master',    icon: Settings,         label: 'Masters' },
      { path: '/dashboard/service-master',  icon: Tag,              label: 'Service Master' },
      { path: '/dashboard/billing-settings',icon: Settings,         label: 'Billing Settings' },
      { path: '/dashboard/reports',         icon: FileText,         label: 'Reports' },
    ];
  }
  else if (role === "Admin") {
    navItems = [
      { path: '/dashboard/admin-dashboard', icon: LayoutDashboard, label: 'Admin Dashboard' },
      { path: '/dashboard/user-approvals',  icon: UserCheck,        label: 'User Approvals' },
      { path: '/dashboard/cabin-master',    icon: Settings,         label: 'Masters' },
      { path: '/dashboard/service-master',  icon: Tag,              label: 'Service Master' },
      { path: '/dashboard/billing-settings',icon: Settings,         label: 'Billing Settings' },
      { path: '/dashboard/reports',         icon: FileText,         label: 'Reports' },
    ];
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar — off-canvas drawer on mobile, static column on lg+ */}
        <aside className={`fixed inset-y-0 left-0 z-40 ${sidebarOpen ? 'w-64' : 'w-20'}
          bg-white border-r border-gray-200 transition-all duration-300 flex flex-col
          transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}>
          {/* Logo */}
          <div className="h-16 flex items-center justify-between border-b border-gray-200 bg-blue-600 px-4">
            {sidebarOpen ? (
              <div className="text-center flex items-center gap-2">
                {mortuaryLogo ? (
                  <img src={getUploadUrl(mortuaryLogo)} alt="Logo" className="h-10 w-10 object-contain" />
                ) : (
                  <span className="text-white font-bold text-xl">M</span>
                )}
                <div>
                  <h1 className="text-white font-bold text-lg">MOSC</h1>
                  <p className="text-blue-200 text-xs">Mortuary Management</p>
                </div>
              </div>
            ) : (
              mortuaryLogo ? (
                <img src={getUploadUrl(mortuaryLogo)} alt="Logo" className="h-10 w-10 object-contain" />
              ) : (
                <span className="text-white font-bold text-xl">M</span>
              )
            )}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-white/80 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {
              role == "House Keeping" && admin == null ?
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut size={20} />
                  {sidebarOpen && <span>Logout</span>}
                </button>
                :
                <>
                  {navItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `sidebar-link ${isActive ? 'active' : ''}`
                      }
                    >
                      <item.icon size={20} />
                      {sidebarOpen && <span>{item.label}</span>}
                    </NavLink>
                  ))}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1"
                  >
                    <LogOut size={20} />
                    {sidebarOpen && <span>Logout</span>}
                  </button>
                </>
            }
          </nav>

          {/* Toggle Button — desktop collapse only */}
          <div className="p-4 border-t border-gray-200 hidden lg:block">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <TrendingUp size={18} className={`transform transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
              {sidebarOpen && <span className="text-sm">Collapse</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto min-w-0">
          {/* Header */}
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden text-gray-600 hover:text-gray-900 shrink-0"
              >
                <Menu size={22} />
              </button>
              {mortuaryLogo && (
                <img src={getUploadUrl(mortuaryLogo)} alt="Logo" className="h-10 w-10 object-contain hidden sm:block shrink-0" />
              )}
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-semibold text-gray-800 truncate">Mortuary Management System</h2>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{mortuaryName}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-sm text-gray-500 hidden md:block">
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  )
}