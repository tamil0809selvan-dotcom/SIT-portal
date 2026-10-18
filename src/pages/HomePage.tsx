// ──────────────────────────────────────────────
// Home Page (Light Mode Only)
// ──────────────────────────────────────────────

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, BookOpen, Phone, Info, ChevronRight } from 'lucide-react';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 text-slate-800">
      {/* Header */}
      <header className="bg-gradient-to-r from-navy-800 to-navy-900 text-white shadow-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-royal-500 rounded-xl flex items-center justify-center shadow-lg shadow-royal-500/30">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">SIT College Portal</h1>
              <p className="text-[11px] sm:text-xs text-blue-200">Student & Faculty Management System</p>
            </div>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <a href="#about" className="flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors">
              <Info className="w-4 h-4" /> About
            </a>
            <a href="#contact" className="flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors">
              <Phone className="w-4 h-4" /> Contact
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-8">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-royal-50 text-royal-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-royal-100">
            <GraduationCap className="w-4 h-4" />
            Welcome to SIT College
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 leading-tight">
            Your Complete
            <span className="bg-gradient-to-r from-royal-600 to-navy-600 bg-clip-text text-transparent"> Academic Portal</span>
          </h2>
          <p className="text-slate-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Access attendance records, exam marks, academic details, and more. 
            A unified platform for students and faculty members.
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Student Portal */}
          <button
            onClick={() => navigate('/student/login')}
            className="group relative bg-white rounded-2xl p-8 shadow-lg shadow-slate-200/50 border border-slate-100
              hover:shadow-2xl hover:border-royal-300 hover:-translate-y-1
              transition-all duration-300 text-left"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-royal-500 to-royal-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-royal-500/25 group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              Student Portal
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-royal-500 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              View your attendance, internal exam marks, academic profile, and important notifications.
            </p>
            <div className="mt-4 text-xs font-semibold text-royal-600 opacity-80 group-hover:opacity-100 transition-opacity">
              Demo: STU2024001 / student123
            </div>
          </button>

          {/* Faculty Portal */}
          <button
            onClick={() => navigate('/faculty/login')}
            className="group relative bg-white rounded-2xl p-8 shadow-lg shadow-slate-200/50 border border-slate-100
              hover:shadow-2xl hover:border-navy-300 hover:-translate-y-1
              transition-all duration-300 text-left"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-navy-600 to-navy-700 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-navy-600/25 group-hover:scale-110 transition-transform duration-300">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              Faculty Portal
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-navy-600 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Manage student attendance, enter internal exam marks, and access faculty tools.
            </p>
            <div className="mt-4 text-xs font-semibold text-navy-600 opacity-80 group-hover:opacity-100 transition-opacity">
              Demo: FAC2020015 / faculty123
            </div>
          </button>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-3">About SIT College</h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            SIT College is committed to providing world-class education in engineering and technology. 
            Our portal streamlines academic administration by providing real-time access to attendance tracking, 
            internal assessment marks, student profiles, and faculty management tools. 
            Empowering students and educators with digital-first solutions.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-3">Contact Us</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm text-slate-500">
            <div>
              <p className="font-semibold text-slate-700 mb-1">Address</p>
              <p>SIT College Campus, Main Road<br />Tamil Nadu, India — 600001</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">Phone</p>
              <p>+91 44 2345 6789</p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">Email</p>
              <p>info@sit.edu</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-900 text-navy-300 text-center text-xs py-5">
        © 2026 SIT College Portal. All rights reserved.
      </footer>
    </div>
  );
};

export default HomePage;
