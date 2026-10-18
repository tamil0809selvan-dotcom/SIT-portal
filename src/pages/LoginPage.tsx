// ──────────────────────────────────────────────
// Login Page — shared by Student and Faculty (Light Mode Only)
// ──────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, ArrowLeft, LogIn, BookOpen, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface LoginPageProps {
  role: UserRole;
}

const LoginPage: React.FC<LoginPageProps> = ({ role }) => {
  const navigate = useNavigate();
  const { login, isAuthenticated, role: currentRole } = useAuth();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated as the same role
  useEffect(() => {
    if (isAuthenticated && currentRole === role) {
      navigate(`/${role}/dashboard`, { replace: true });
    }
  }, [isAuthenticated, currentRole, role, navigate]);

  const isStudent = role === 'student';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate small network delay
    setTimeout(() => {
      const result = login(id, password, role);
      if (result.success) {
        navigate(`/${role}/dashboard`, { replace: true });
      } else {
        setError(result.error || 'Login failed');
      }
      setLoading(false);
    }, 400);
  };

  const handleAutofill = () => {
    if (isStudent) {
      setId('STU2024001');
      setPassword('student123');
    } else {
      setId('FAC2020015');
      setPassword('faculty123');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex flex-col">
      {/* Compact header */}
      <header className="bg-gradient-to-r from-navy-800 to-navy-900 text-white px-4 sm:px-6 py-3.5 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-royal-500 rounded-lg flex items-center justify-center shadow-md">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-sm sm:text-base">SIT College Portal</span>
          </div>
        </div>
      </header>

      {/* Login form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Link>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                isStudent
                  ? 'bg-gradient-to-br from-royal-500 to-royal-600 shadow-royal-500/25'
                  : 'bg-gradient-to-br from-navy-600 to-navy-700 shadow-navy-600/25'
              }`}>
                {isStudent ? <BookOpen className="w-8 h-8 text-white" /> : <Users className="w-8 h-8 text-white" />}
              </div>
            </div>

            <h2 className="text-2xl font-bold text-center text-slate-800 mb-1">
              {isStudent ? 'Student Login' : 'Faculty Login'}
            </h2>
            <p className="text-sm text-center text-slate-400 mb-8">
              Enter your credentials to access the portal
            </p>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5 flex items-start gap-2">
                <span className="mt-0.5 shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ID field */}
              <div>
                <label htmlFor="user-id" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {isStudent ? 'Student ID' : 'Faculty ID'}
                </label>
                <input
                  id="user-id"
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder={isStudent ? 'e.g. STU2024001' : 'e.g. FAC2020015'}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm
                    focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-400
                    placeholder:text-slate-300 transition-all"
                  autoFocus
                  autoComplete="username"
                />
              </div>

              {/* Password field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm
                      focus:outline-none focus:ring-2 focus:ring-royal-500/30 focus:border-royal-400
                      placeholder:text-slate-300 transition-all pr-12"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2
                  transition-all duration-200 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed
                  ${isStudent
                    ? 'bg-gradient-to-r from-royal-500 to-royal-600 hover:from-royal-600 hover:to-royal-700 shadow-royal-500/25'
                    : 'bg-gradient-to-r from-navy-600 to-navy-700 hover:from-navy-700 hover:to-navy-800 shadow-navy-600/25'
                  }`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Demo hint */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center mb-2">Demo Credentials:</p>
              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 font-mono text-center flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">ID:</span> {isStudent ? 'STU2024001' : 'FAC2020015'} &nbsp;|&nbsp; 
                  <span className="font-semibold text-slate-800"> Pass:</span> {isStudent ? 'student123' : 'faculty123'}
                </div>
                <button
                  type="button"
                  onClick={handleAutofill}
                  className="ml-2 px-2.5 py-1 rounded bg-royal-50 text-royal-700 font-sans font-semibold text-[11px] hover:bg-royal-100 transition-colors"
                >
                  Autofill
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
