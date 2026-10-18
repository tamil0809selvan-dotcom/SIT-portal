// ──────────────────────────────────────────────
// Top Header Bar Component (Light Mode)
// ──────────────────────────────────────────────

import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, title }) => {
  const { user, role } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5">
        {/* Left: hamburger + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 truncate">
              {title || 'Dashboard'}
            </h1>
          </div>
        </div>

        {/* Right: notification + user badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications button */}
          <button
            aria-label="Notifications"
            className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User badge */}
          <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm ${
              role === 'faculty' ? 'bg-navy-700' : 'bg-royal-600'
            }`}>
              {user?.name.charAt(0)}
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold text-slate-800 max-w-[140px] truncate">
                {user?.name.split(' ')[0]}
              </span>
              <span className="block text-[10px] text-slate-400 capitalize">
                {role}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
