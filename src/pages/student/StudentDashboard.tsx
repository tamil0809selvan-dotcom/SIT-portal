// ──────────────────────────────────────────────
// Student Dashboard — Displays ONLY Student Personal Details (Light Mode Only)
// ──────────────────────────────────────────────

import React from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  Award,
  Droplets,
  GraduationCap,
  Hash,
  Users,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StudentUser } from '../../types';

/** Returns ordinal suffix: 1st, 2nd, 3rd, 4th… */
const ordinal = (n: number): string => {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
};

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const student = user as StudentUser;

  if (!student) return null;

  const personalDetails = [
    { icon: Hash, label: 'Student ID / Roll No', value: student.id },
    { icon: GraduationCap, label: 'Department', value: student.department },
    { icon: BookOpen, label: 'Academic Standing', value: `${ordinal(student.year)} Year — Semester ${student.semester}` },
    { icon: Users, label: 'Class Section', value: `Section ${student.section}` },
    { icon: Award, label: 'Cumulative CGPA', value: student.cgpa.toFixed(2) },
    { icon: Mail, label: 'College Email', value: student.email },
    { icon: Phone, label: 'Mobile Number', value: student.phone },
    { icon: Calendar, label: 'Date of Birth', value: student.dob },
    { icon: Droplets, label: 'Blood Group', value: student.bloodGroup },
    { icon: Calendar, label: 'Admission Year', value: String(student.admissionYear) },
    { icon: User, label: 'Parent / Guardian', value: student.parentName },
    { icon: Phone, label: 'Guardian Phone', value: student.parentPhone },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Unified Profile Card ──────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
        {/* Header: Avatar + Student Identity */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-slate-100">
          {/* Avatar with royal gradient */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-royal-500 to-navy-700 text-white font-black text-3xl sm:text-4xl flex items-center justify-center shrink-0 shadow-lg shadow-royal-500/20 ring-4 ring-royal-50">
            {student.name.charAt(0)}
          </div>

          {/* Student Name & Department */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-1">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
                {student.name}
              </h2>
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Active Student
              </span>
            </div>
            <p className="text-sm sm:text-base font-medium text-slate-600">
              {student.department}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                ID: {student.id}
              </span>
              <span>•</span>
              <span>{ordinal(student.year)} Year</span>
              <span>•</span>
              <span>Semester {student.semester}</span>
              <span>•</span>
              <span>Section {student.section}</span>
            </div>
          </div>
        </div>

        {/* Section Heading */}
        <div className="pt-6 pb-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-royal-600" />
            Student Personal & Academic Details
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified credentials registered in the college management records
          </p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {personalDetails.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-50/80 hover:bg-slate-100/60 transition-colors rounded-xl p-3.5 border border-slate-100 flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-white shadow-sm border border-slate-100 text-royal-600 flex items-center justify-center shrink-0 mt-0.5">
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
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50 rounded-2xl p-4 sm:p-5 border border-blue-100 flex items-center gap-3.5 text-blue-900 transition-colors">
        <div className="w-9 h-9 rounded-xl bg-royal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-royal-600/20">
          <Compass className="w-5 h-5" />
        </div>
        <div className="text-xs sm:text-sm">
          <span className="font-bold text-slate-900">Portal Navigation: </span>
          <span className="text-slate-600">
            Use the sidebar to view your <strong>Attendance</strong>, <strong>Internal Exam 1</strong>, and <strong>Internal Exam 2</strong> subject marks.
          </span>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
