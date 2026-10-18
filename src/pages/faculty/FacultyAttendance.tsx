// ──────────────────────────────────────────────
// Faculty Attendance Entry — 60 students (Empty unentered inputs, Light Mode Only)
// ──────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  ClipboardCheck,
  Search,
  RefreshCw,
} from 'lucide-react';
import { useData } from '../../context/DataContext';

const FacultyAttendance: React.FC = () => {
  const { records, updateAttendance, saveAttendance, maxMarks } = useData();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = useCallback(
    (sno: number, value: string) => {
      // Allow blank input while editing / unentered state
      if (value === '') {
        updateAttendance(sno, null);
        return;
      }
      // Numbers only, maximum 3 digits
      const cleaned = value.replace(/[^0-9]/g, '').slice(0, 3);
      if (cleaned === '') {
        updateAttendance(sno, null);
        return;
      }
      const num = parseInt(cleaned, 10);
      updateAttendance(sno, num);
    },
    [updateAttendance]
  );

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      const result = saveAttendance();
      if (result.success) {
        const count = result.enteredCount ?? 0;
        setMessage({
          type: 'success',
          text:
            count > 0
              ? `Attendance saved successfully! (${count} of ${records.length} students recorded)`
              : `Attendance saved. All ${records.length} records are currently unentered (empty).`,
        });
      } else {
        setMessage({
          type: 'error',
          text:
            result.errors[0] ??
            `Validation failed. Please verify attendance percentages (0–${maxMarks.attendance}%).`,
        });
      }
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }, 250);
  };

  const filtered = searchTerm.trim()
    ? records.filter(
        (r) =>
          r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.studentId.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : records;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* ── Page Header ────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Student Attendance Management
            </h2>
            <p className="text-xs text-slate-400">
              Enter attendance percentage (0–100%) for all 60 students
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-600/25 transition-all disabled:opacity-60 self-end sm:self-auto"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Attendance'}
        </button>
      </div>

      {/* ── Toast Message ─────────────────── */}
      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* ── Search Bar ────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter students by name or roll number…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-16 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 placeholder:text-slate-400"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── 60 Students Attendance Table ─────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th className="text-left px-4 py-3 w-16">S.No.</th>
                <th className="text-left px-4 py-3">Student Name</th>
                <th className="text-left px-4 py-3 w-36">Roll Number</th>
                <th className="text-left px-4 py-3 w-48">Attendance (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-sm text-slate-400">
                    No students found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((record) => {
                  const val = record.attendance;
                  return (
                    <tr
                      key={record.sno}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-sm text-slate-500 font-medium">
                        {record.sno}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-sm font-semibold text-slate-800">
                          {record.name}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-slate-500 font-mono">
                          {record.studentId}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={val !== null && val !== undefined ? String(val) : ''}
                            onChange={(e) => handleChange(record.sno, e.target.value)}
                            placeholder="Enter %"
                            maxLength={3}
                            aria-label={`Attendance for ${record.name}`}
                            className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/80 text-slate-800 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder:text-slate-300"
                          />
                          <span className="text-xs text-slate-400 font-medium">
                            %
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom Save Action ─────────── */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-slate-400">
          Showing {filtered.length} of {records.length} students
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-600/25 transition-all disabled:opacity-60"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Attendance'}
        </button>
      </div>
    </div>
  );
};

export default FacultyAttendance;
