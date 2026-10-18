// ──────────────────────────────────────────────
// Dashboard Layout — sidebar + header + content area
// ──────────────────────────────────────────────

import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface DashboardLayoutProps {
  requiredRole: UserRole;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ requiredRole }) => {
  const { isAuthenticated, role } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated || role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100/70 text-slate-800">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
