// ──────────────────────────────────────────────
// Sidebar Component — desktop persistent, mobile slide-out
// ──────────────────────────────────────────────

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  FilePenLine,
  UserCircle,
  Settings,
  LogOut,
  X,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { role, logout, user } = useAuth();
  const navigate = useNavigate();
  const basePath = role === 'faculty' ? '/faculty' : '/student';

  const navItems = [
    { to: `${basePath}/dashboard`, icon: LayoutDashboard, label: 'Dashboard' },
    { to: `${basePath}/attendance`, icon: ClipboardCheck, label: 'Attendance' },
    { to: `${basePath}/internal1`, icon: FileText, label: 'Internal Exam 1' },
    { to: `${basePath}/internal2`, icon: FilePenLine, label: 'Internal Exam 2' },
    { to: `${basePath}/profile`, icon: UserCircle, label: 'Profile' },
    { to: `${basePath}/settings`, icon: Settings, label: 'Settings' },
  ];

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/', { replace: true });
  };

  const handleNavClick = () => {
    // Close sidebar on mobile after clicking a nav item
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden overlay"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-navy-800 to-navy-950
          text-white z-50 sidebar-transition flex flex-col
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-royal-500 rounded-xl flex items-center justify-center shadow-lg shadow-royal-500/30">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm leading-tight">SIT Portal</h2>
              <p className="text-[11px] text-navy-300 capitalize">{role} Panel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User pill */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2.5">
            <div className="w-9 h-9 rounded-full bg-royal-500 flex items-center justify-center text-sm font-bold shrink-0 shadow-md">
              {user?.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-[11px] text-navy-300 truncate">{user?.id}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-royal-500 text-white shadow-lg shadow-royal-500/30'
                      : 'text-navy-200 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="w-[18px] h-[18px] shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5 pt-2 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/15 hover:text-red-200 transition-all duration-200"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
