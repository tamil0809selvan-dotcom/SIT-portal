// ──────────────────────────────────────────────
// Faculty Dashboard — Displays ONLY Faculty Personal Details (Light Mode Only)
// ──────────────────────────────────────────────

import React from 'react';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Award,
  Hash,
  BookOpen,
  Calendar,
  Star,
  GraduationCap,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { FacultyUser } from '../../types';

const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const faculty = user as FacultyUser;

  if (!faculty) return null;

  const facultyDetails = [
    { icon: Hash, label: 'Faculty ID / Staff Code', value: faculty.id },
    { icon: Briefcase, label: 'Academic Designation', value: faculty.designation },
    { icon: GraduationCap, label: 'Faculty Department', value: faculty.department },
    { icon: Award, label: 'Highest Qualification', value: faculty.qualification },
    { icon: Star, label: 'Research & Specialization', value: faculty.specialization },
    { icon: BookOpen, label: 'Teaching Experience', value: faculty.experience },
    { icon: Calendar, label: 'Year of Joining SIT', value: String(faculty.joinYear) },
    { icon: Mail, label: 'Official College Email', value: faculty.email },
    { icon: Phone, label: 'Contact Phone Number', value: faculty.phone },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Unified Profile Card ──────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
        {/* Header: Avatar + Faculty Identity */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-slate-100">
          {/* Avatar with navy gradient */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-navy-700 to-navy-950 text-white font-black text-3xl sm:text-4xl flex items-center justify-center shrink-0 shadow-lg shadow-navy-950/20 ring-4 ring-navy-50">
            {faculty.name.charAt(0)}
          </div>

          {/* Name & Title */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
                {faculty.name}
              </h2>
              <span className="inline-flex items-center gap-1 bg-royal-50 text-royal-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-royal-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Faculty Member
              </span>
            </div>
            <p className="text-sm sm:text-base font-medium text-slate-600">
              {faculty.designation} — {faculty.department}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                Staff ID: {faculty.id}
              </span>
              <span>•</span>
              <span>{faculty.qualification}</span>
              <span>•</span>
              <span>{faculty.experience} Experience</span>
            </div>
          </div>
        </div>

        {/* Section Heading */}
        <div className="pt-6 pb-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-navy-600" />
            Faculty Staff Credentials & Details
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Official academic credentials, contact info, and departmental records
          </p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {facultyDetails.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-50/80 hover:bg-slate-100/60 transition-colors rounded-xl p-3.5 border border-slate-100 flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-white shadow-sm border border-slate-100 text-navy-700 flex items-center justify-center shrink-0 mt-0.5">
                <item.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {item.label}
                </p>
                <p className="text-sm font-bold text-slate-800 mt-0.5 break-words">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Navigation Advisory Banner ──────────────── */}
      <div className="bg-gradient-to-r from-slate-100/80 via-slate-50 to-slate-100/60 rounded-2xl p-4 sm:p-5 border border-slate-200 flex items-center gap-3.5 text-slate-800 transition-colors">
        <div className="w-9 h-9 rounded-xl bg-navy-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-navy-800/20">
          <Compass className="w-5 h-5" />
        </div>
        <div className="text-xs sm:text-sm">
          <span className="font-bold text-slate-900">Faculty Navigation: </span>
          <span className="text-slate-600">
            Use the sidebar to enter student <strong>Attendance</strong>, record <strong>Internal Exam 1</strong> marks, or enter <strong>Internal Exam 2</strong> marks across all 6 subjects.
          </span>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
