// ──────────────────────────────────────────────
// Profile Page — Student or Faculty (Clean layout, Light Mode Only)
// ──────────────────────────────────────────────

import React from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  Award,
  Briefcase,
  Star,
  Hash,
  Droplets,
  GraduationCap,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StudentUser, FacultyUser } from '../types';

const ProfilePage: React.FC = () => {
  const { user, role } = useAuth();

  if (!user) return null;

  const isStudent = role === 'student';
  const student = user as StudentUser;
  const faculty = user as FacultyUser;

  const fields = isStudent
    ? [
        { icon: Hash, label: 'Student ID / Roll No', value: student.id },
        { icon: GraduationCap, label: 'Department', value: student.department },
        { icon: BookOpen, label: 'Year & Semester', value: `${student.year}rd Year — Semester ${student.semester}` },
        { icon: Users, label: 'Section', value: `Section ${student.section}` },
        { icon: Award, label: 'Cumulative CGPA', value: student.cgpa.toFixed(2) },
        { icon: Mail, label: 'Email Address', value: student.email },
        { icon: Phone, label: 'Phone Number', value: student.phone },
        { icon: Calendar, label: 'Date of Birth', value: student.dob },
        { icon: Droplets, label: 'Blood Group', value: student.bloodGroup },
        { icon: Calendar, label: 'Admission Year', value: String(student.admissionYear) },
        { icon: User, label: 'Parent / Guardian', value: student.parentName },
        { icon: Phone, label: 'Parent Contact', value: student.parentPhone },
      ]
    : [
        { icon: Hash, label: 'Faculty ID / Staff Code', value: faculty.id },
        { icon: GraduationCap, label: 'Department', value: faculty.department },
        { icon: Briefcase, label: 'Designation', value: faculty.designation },
        { icon: Award, label: 'Qualification', value: faculty.qualification },
        { icon: Star, label: 'Research / Specialization', value: faculty.specialization },
        { icon: Mail, label: 'Official Email', value: faculty.email },
        { icon: Phone, label: 'Contact Phone', value: faculty.phone },
        { icon: BookOpen, label: 'Experience', value: faculty.experience },
        { icon: Calendar, label: 'Year of Joining', value: String(faculty.joinYear) },
      ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Profile Card ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
        {/* Header: Avatar + User Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-slate-100">
          <div
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center font-black text-3xl sm:text-4xl text-white shrink-0 shadow-lg ${
              isStudent
                ? 'bg-gradient-to-br from-royal-500 to-navy-700 ring-4 ring-royal-50'
                : 'bg-gradient-to-br from-navy-700 to-navy-950 ring-4 ring-navy-50'
            }`}
          >
            {user.name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
                {user.name}
              </h2>
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  isStudent
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-royal-50 text-royal-700 border-royal-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {isStudent ? 'Student Account' : 'Faculty Staff'}
              </span>
            </div>

            {/* Department */}
            <p className="text-sm sm:text-base font-semibold text-slate-600 break-words">
              {isStudent ? (user as StudentUser).department : (user as FacultyUser).department}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 mt-2 text-xs text-slate-500">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                ID: {user.id}
              </span>
              <span>•</span>
              <span className="capitalize">{role} Portal User</span>
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div className="pt-6 pb-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-royal-600" />
            Complete Profile Details
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Registered information and personal records
          </p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {fields.map((f, i) => (
            <div
              key={i}
              className="bg-slate-50/80 hover:bg-slate-100/60 transition-colors rounded-xl p-4 border border-slate-100 flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-white shadow-sm border border-slate-100 text-royal-600 flex items-center justify-center shrink-0 mt-0.5">
                <f.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">
                  {f.label}
                </span>
                <p className="text-sm font-bold text-slate-800 break-words">
                  {f.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
