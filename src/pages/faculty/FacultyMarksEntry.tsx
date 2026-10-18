// ──────────────────────────────────────────────
// Faculty Internal Marks Entry — Simplified Data Entry for Six Core Subjects (Light Mode Only)
// ──────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  RefreshCw,
  BookOpen,
  ChevronDown,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { SUBJECTS, SubjectName } from '../../types';

interface FacultyMarksEntryProps {
  examNumber: 1 | 2;
}

const FacultyMarksEntry: React.FC<FacultyMarksEntryProps> = ({ examNumber }) => {
  const {
    records,
    updateInternal1,
    updateInternal2,
    updateMaxMark,
    saveInternal1,
    saveInternal2,
    maxMarks,
    loading: dataLoading,
  } = useData();
  const [selectedSubject, setSelectedSubject] = useState<SubjectName>(SUBJECTS[0]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  const maxMark = examNumber === 1 ? maxMarks.internal1 : maxMarks.internal2;
  const field = examNumber === 1 ? 'internal1' : 'internal2';
  const updateFn = examNumber === 1 ? updateInternal1 : updateInternal2;
  const saveFn = examNumber === 1 ? saveInternal1 : saveInternal2;

  const handleMaxMarkChange = (valStr: string) => {
    const cleaned = valStr.replace(/[^0-9]/g, '').slice(0, 3);
    const num = cleaned === '' ? 100 : Math.max(1, Math.min(999, parseInt(cleaned, 10)));
    updateMaxMark(field, num);
  };

  const handleChange = useCallback(
    (sno: number, value: string) => {
      // Allow blank input while editing / unentered state
      if (value === '') {
        updateFn(sno, selectedSubject, null);
        return;
      }
      // Numbers only, maximum 3 digits
      const cleaned = value.replace(/[^0-9]/g, '').slice(0, 3);
      if (cleaned === '') {
        updateFn(sno, selectedSubject, null);
        return;
      }
      const num = parseInt(cleaned, 10);
      updateFn(sno, selectedSubject, num);
    },
    [updateFn, selectedSubject]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveFn(selectedSubject);
      if (result.success) {
        const count = result.enteredCount ?? 0;
        setMessage({
          type: 'success',
          text:
            count > 0
              ? `Internal Exam ${examNumber} marks for "${selectedSubject}" saved successfully to Supabase! (${count} of ${records.length} students recorded)`
              : `Internal Exam ${examNumber} marks for "${selectedSubject}" saved. All fields are currently unentered (empty/null).`,
        });
      } else {
        console.error('[FacultyMarksEntry] Save failed with errors:', result.errors);
        setMessage({
          type: 'error',
          text:
            result.errors[0] ??
            `Validation failed. Please ensure marks are between 0 and ${maxMark}.`,
        });
      }
    } catch (err: any) {
      console.error('[FacultyMarksEntry] Save exception:', err);
      setMessage({ type: 'error', text: err?.message || 'Failed to save marks to Supabase.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
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
      {/* ── Page Header: Title + Inline Max Marks + Save Button ─────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-royal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-royal-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Internal Exam {examNumber} — Marks Entry
            </h2>
            <p className="text-xs text-slate-400">
              Select a subject and enter numeric marks for 60 students
            </p>
          </div>
        </div>

        {/* Max Marks Config + Save */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <label htmlFor={`max-mark-${examNumber}`} className="text-xs font-semibold text-slate-600">
              Max Mark:
            </label>
            <input
              id={`max-mark-${examNumber}`}
              type="text"
              inputMode="numeric"
              maxLength={3}
              value={maxMark}
              onChange={(e) => handleMaxMarkChange(e.target.value)}
              className="w-12 text-center text-xs font-bold bg-white text-slate-800 border border-slate-200 rounded-lg py-0.5 focus:outline-none focus:ring-1 focus:ring-royal-500"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-royal-600 hover:bg-royal-700 text-white text-sm font-semibold shadow-md shadow-royal-600/25 transition-all disabled:opacity-60"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Marks'}
          </button>
        </div>
      </div>

      {/* ── Subject Selector (Clean Tabs on Desktop, Dropdown on Mobile) ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-royal-600" />
            Select Subject:
          </span>
          <span className="text-slate-400">
            Current: <strong className="text-royal-600">{selectedSubject}</strong>
          </span>
        </div>

        {/* Mobile Dropdown */}
        <div className="relative sm:hidden">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value as SubjectName)}
            className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-royal-500/30"
          >
            {SUBJECTS.map((s, idx) => (
              <option key={s} value={s}>
                {idx + 1}. {s}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Desktop Buttons */}
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-2">
          {SUBJECTS.map((subj, idx) => {
            const isSelected = selectedSubject === subj;
            return (
              <button
                key={subj}
                type="button"
                onClick={() => setSelectedSubject(subj)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-navy-800 text-white border-navy-800 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}>
                  {idx + 1}
                </span>
                <span className="truncate">{subj}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Status Message Toast ─────────── */}
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
          className="w-full pl-10 pr-16 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500/30 placeholder:text-slate-400"
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

      {/* ── 60 Students Marks Table (Clean & Focused on Data Entry) ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th className="text-left px-4 py-3 w-16">S.No.</th>
                <th className="text-left px-4 py-3">Student Name</th>
                <th className="text-left px-4 py-3 w-36">Roll Number</th>
                <th className="text-left px-4 py-3 w-44">Marks (0–{maxMark})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dataLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-sm text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-royal-600" />
                      <span>Loading marks records from Supabase…</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-sm text-slate-400">
                    No students found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((record) => {
                  const val = record[field]?.[selectedSubject] ?? null;
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
                            placeholder="Enter marks"
                            maxLength={3}
                            aria-label={`Internal ${examNumber} marks for ${record.name} in ${selectedSubject}`}
                            className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/80 text-slate-800 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-royal-500/40 placeholder:text-slate-300"
                          />
                          <span className="text-xs text-slate-400 font-medium">
                            / {maxMark}
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
          Showing {filtered.length} of {records.length} students for <strong>{selectedSubject}</strong>
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-royal-600 hover:bg-royal-700 text-white text-sm font-semibold shadow-md shadow-royal-600/25 transition-all disabled:opacity-60"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Marks'}
        </button>
      </div>
    </div>
  );
};

export default FacultyMarksEntry;
