// ──────────────────────────────────────────────
// Student Attendance View (Read-Only, Light Mode)
// ──────────────────────────────────────────────

import React from 'react';
import { ClipboardCheck, TrendingUp, TrendingDown, Info, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { StudentUser } from '../../types';

const StudentAttendance: React.FC = () => {
  const { user } = useAuth();
  const { getStudentRecord } = useData();
  const student = user as StudentUser;
  const record = getStudentRecord(student.id);

  const rawAttendance = record?.attendance;
  const hasAttendance = rawAttendance !== null && rawAttendance !== undefined;
  const attendance = hasAttendance ? Number(rawAttendance) : null;
  const isLow = attendance !== null && attendance < 75;

  // Progress bar colour
  const progressColor = attendance === null
    ? '#94a3b8'
    : isLow
    ? '#ef4444'
    : attendance >= 90
    ? '#10b981'
    : '#f59e0b';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white shrink-0">
          <ClipboardCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">My Attendance</h2>
          <p className="text-xs text-slate-400">Current semester attendance record (read-only)</p>
        </div>
      </div>

      {/* Attendance Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          {/* Circular indicator */}
          <div
            className="w-36 h-36 rounded-full flex items-center justify-center border-[6px] mb-5 shadow-inner"
            style={{
              borderColor: progressColor,
              backgroundColor:
                attendance === null
                  ? '#f8fafc'
                  : isLow
                  ? '#fef2f2'
                  : attendance >= 90
                  ? '#f0fdf4'
                  : '#fffbeb',
            }}
          >
            <div>
              {attendance !== null ? (
                <>
                  <span
                    className="text-4xl font-extrabold"
                    style={{ color: progressColor }}
                  >
                    {attendance}
                  </span>
                  <span className="text-xl font-bold text-slate-400">%</span>
                </>
              ) : (
                <span className="text-3xl font-extrabold text-slate-400">—</span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-xs mb-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>0%</span>
              <span className="text-slate-600 font-medium">Minimum: 75%</span>
              <span>100%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${attendance ?? 0}%`,
                  backgroundColor: progressColor,
                }}
              />
            </div>
          </div>

          <h3 className="text-lg font-bold text-slate-800 mb-1">Overall Attendance</h3>
          <p className="text-sm text-slate-400 mb-4">
            Semester {student.semester} — {student.department}
          </p>

          {/* Status badge */}
          {attendance !== null ? (
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${
                isLow
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {isLow ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              {isLow ? 'Below minimum (75%)' : attendance >= 90 ? 'Excellent standing' : 'Good standing'}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-slate-100 text-slate-600 border border-slate-200">
              <Clock className="w-4 h-4 text-slate-400" />
              Not Recorded Yet
            </div>
          )}

          {isLow && (
            <div className="mt-4 text-sm text-red-700 bg-red-50 rounded-xl p-4 border border-red-200 text-left w-full max-w-sm">
              <p className="font-semibold mb-1">⚠️ Attendance Warning</p>
              <p className="text-xs leading-relaxed">
                Your attendance is below the required 75%. You may be detained from exams.
                Please contact your class advisor immediately.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2.5 text-xs text-slate-500 bg-slate-50/90 rounded-2xl p-4 border border-slate-200/70">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Note:</strong> Attendance is updated regularly by faculty members. If you find any discrepancies in your attendance record, please contact your class advisor.
        </p>
      </div>
    </div>
  );
};

export default StudentAttendance;
