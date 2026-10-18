// ──────────────────────────────────────────────
// Student Internal Marks View — Six Core Subjects (Read-Only, Light Mode)
// ──────────────────────────────────────────────

import React from 'react';
import {
  FileText,
  Award,
  Info,
  CheckCircle2,
  XCircle,
  BookOpen,
  Calculator,
  Percent,
  GraduationCap,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { StudentUser, SUBJECTS } from '../../types';

interface StudentMarksViewProps {
  examNumber: 1 | 2;
}

// Subject course codes for collegiate appearance
const SUBJECT_CODES: Record<string, string> = {
  'Discrete Mathematics': 'MA3354',
  'Data Structure': 'CS3301',
  'Object Oriented Programming Using Python': 'CS3391',
  'Computer Organisation': 'CS3351',
  'Operating System': 'CS3452',
  'Database System Design': 'CS3392',
};

const StudentMarksView: React.FC<StudentMarksViewProps> = ({ examNumber }) => {
  const { user } = useAuth();
  const { getStudentRecord, maxMarks, loading } = useData();
  const student = user as StudentUser;
  const record = student ? getStudentRecord(student.id) : undefined;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-3 border-royal-600/30 border-t-royal-600 rounded-full animate-spin" />
          <p className="text-sm font-medium">Fetching subject marks from Supabase…</p>
        </div>
      </div>
    );
  }

  const maxMark = examNumber === 1 ? maxMarks.internal1 : maxMarks.internal2;
  const subjectMarksMap = examNumber === 1 ? record?.internal1 : record?.internal2;

  // Compile subject-wise marks
  const subjectItems = SUBJECTS.map((subject) => {
    const rawVal = subjectMarksMap?.[subject] ?? null;
    const hasEntered = rawVal !== null && rawVal !== undefined;
    const marksObtained = hasEntered ? Number(rawVal) : null;
    const pct = hasEntered && maxMark > 0 ? Math.round((marksObtained! / maxMark) * 100) : null;
    const isPass = pct !== null ? pct >= 40 : null;

    let grade = '—';
    if (pct !== null) {
      if (pct >= 90) {
        grade = 'O (Outstanding)';
      } else if (pct >= 80) {
        grade = 'A+ (Excellent)';
      } else if (pct >= 70) {
        grade = 'A (Very Good)';
      } else if (pct >= 60) {
        grade = 'B+ (Good)';
      } else if (pct >= 50) {
        grade = 'B (Above Avg)';
      } else if (pct >= 40) {
        grade = 'C (Pass)';
      } else {
        grade = 'F (Reappear)';
      }
    }

    return {
      name: subject,
      code: SUBJECT_CODES[subject] ?? 'CS3000',
      marks: marksObtained,
      hasEntered,
      maxMark,
      percentage: pct,
      isPass,
      grade,
    };
  });

  // Calculate dynamically derived summary statistics for entered subjects
  const enteredItems = subjectItems.filter((s) => s.hasEntered);
  const totalScored = enteredItems.reduce((acc, curr) => acc + (curr.marks ?? 0), 0);
  const totalMax = maxMark * subjectItems.length;
  const averagePercentage =
    enteredItems.length > 0 && maxMark > 0
      ? Math.round((totalScored / (maxMark * enteredItems.length)) * 100)
      : null;
  const passedCount = subjectItems.filter((s) => s.isPass === true).length;
  const allPassed = enteredItems.length === 6 && passedCount === 6;

  // Theming per exam (Light theme with blue/amber accents)
  const gradientClass = examNumber === 1 ? 'from-royal-600 to-navy-700' : 'from-amber-500 to-amber-700';
  const shadowClass = examNumber === 1 ? 'shadow-royal-500/20' : 'shadow-amber-500/20';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Page Header ────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-lg ${shadowClass} text-white shrink-0`}>
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800">
                Internal Exam {examNumber} — Subject Marks
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-royal-50 text-royal-700 border-royal-200">
                Read-Only
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Department of {student.department} • 6 Core Subjects
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-royal-600" />
            Semester {student.semester}
          </span>
        </div>
      </div>

      {/* ── Calculated Academic Summary Bar ────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Calculator className="w-4 h-4 text-royal-500" />
            <span className="text-xs font-medium uppercase tracking-wide">Total Score</span>
          </div>
          <p className="text-xl font-bold text-slate-800">
            {enteredItems.length > 0 ? (
              <>
                {totalScored} <span className="text-xs text-slate-400 font-normal">/ {maxMark * enteredItems.length}</span>
              </>
            ) : (
              <span className="text-slate-400 font-normal text-lg">—</span>
            )}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {enteredItems.length} of 6 subjects recorded
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Percent className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium uppercase tracking-wide">Aggregate</span>
          </div>
          <p className="text-xl font-bold text-emerald-600">
            {averagePercentage !== null ? `${averagePercentage}%` : '—'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {enteredItems.length > 0 ? 'Recorded subjects avg' : 'Awaiting entries'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Award className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium uppercase tracking-wide">Standing</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-slate-800 truncate">
            {averagePercentage !== null
              ? averagePercentage >= 75
                ? 'Distinction'
                : averagePercentage >= 60
                ? 'First Class'
                : 'Pass'
              : '—'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Based on internal marks</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium uppercase tracking-wide">Clearance</span>
          </div>
          <p className="text-xl font-bold text-slate-800">
            {enteredItems.length > 0 ? (
              <>
                {passedCount} <span className="text-xs text-slate-400 font-normal">/ {enteredItems.length} Passed</span>
              </>
            ) : (
              <span className="text-slate-400 font-normal text-lg">—</span>
            )}
          </p>
          <p className={`text-[11px] font-semibold mt-0.5 ${allPassed ? 'text-emerald-600' : 'text-slate-500'}`}>
            {enteredItems.length === 0
              ? 'No marks recorded'
              : allPassed
              ? 'All Subjects Cleared'
              : `${enteredItems.length - passedCount} Subject Pending`}
          </p>
        </div>
      </div>

      {/* ── Subject-Wise Marks Table ────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-royal-600" />
            <h3 className="text-sm font-bold text-slate-800">Six Core Subjects — Mark Sheet</h3>
          </div>
          <span className="text-xs text-slate-400">Passing threshold: 40%</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 text-left w-12">#</th>
                <th className="py-3 px-4 text-left">Subject Name</th>
                <th className="py-3 px-4 text-center w-32">Marks Obtained</th>
                <th className="py-3 px-4 text-center w-28">Max Marks</th>
                <th className="py-3 px-4 text-center w-36">Performance</th>
                <th className="py-3 px-4 text-center w-32">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjectItems.map((item, idx) => (
                <tr key={item.name} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                  <td className="py-3.5 px-4">
                    <p className="text-sm font-bold text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{item.code}</p>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {item.hasEntered ? (
                      <span className="text-base font-extrabold text-slate-800">{item.marks}</span>
                    ) : (
                      <span className="text-slate-400 font-semibold">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center text-xs font-semibold text-slate-500">
                    {item.maxMark}
                  </td>
                  <td className="py-3.5 px-4">
                    {item.hasEntered && item.percentage !== null ? (
                      <>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-slate-700">{item.percentage}%</span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {item.grade.split(' ')[0]}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              item.percentage >= 80
                                ? 'bg-emerald-500'
                                : item.percentage >= 60
                                ? 'bg-royal-500'
                                : item.percentage >= 40
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, item.percentage)}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="text-center">
                        <span className="text-xs text-slate-400 italic">Not entered yet</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {item.hasEntered && item.isPass !== null ? (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                          item.isPass
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-600 border-red-200'
                        }`}
                      >
                        {item.isPass ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> Fail
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold text-slate-700 border-t border-slate-200">
                <td colSpan={2} className="py-3 px-4 text-xs uppercase tracking-wider text-slate-500">
                  Total Aggregate
                </td>
                <td className="py-3 px-4 text-center text-sm font-extrabold text-royal-600">
                  {enteredItems.length > 0 ? totalScored : '—'}
                </td>
                <td className="py-3 px-4 text-center text-xs text-slate-500">{totalMax}</td>
                <td className="py-3 px-4 text-center text-sm text-emerald-600 font-extrabold">
                  {averagePercentage !== null ? `${averagePercentage}% Avg` : '—'}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                    {enteredItems.length === 0
                      ? 'PENDING'
                      : allPassed
                      ? 'ALL PASS'
                      : 'EVALUATED'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Read-Only Information Note ────────────── */}
      <div className="flex items-start gap-2.5 text-xs text-slate-500 bg-slate-50/90 rounded-2xl p-4 border border-slate-200/70">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Note:</strong> These Internal Exam {examNumber} marks are published by your respective course faculty members. If you notice any discrepancy in marks evaluation, please contact your subject faculty advisor within 3 working days.
        </p>
      </div>
    </div>
  );
};

export default StudentMarksView;
