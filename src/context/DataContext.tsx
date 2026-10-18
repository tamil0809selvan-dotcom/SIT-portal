// ──────────────────────────────────────────────
// Data Context: Attendance & Subject-Wise Marks Integrated with Supabase
// ──────────────────────────────────────────────

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { StudentRecord, MaxMarksConfig, SUBJECTS, SubjectMarksMap } from '../types';
import { MAX_MARKS, generateStudentRecords } from '../data/demoData';
import { supabase } from '../supabase';
import { useAuth } from './AuthContext';

interface DataContextType {
  records: StudentRecord[];
  maxMarks: MaxMarksConfig;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  updateAttendance: (sno: number, value: number | null) => void;
  updateInternal1: (sno: number, subject: string, value: number | null) => void;
  updateInternal2: (sno: number, subject: string, value: number | null) => void;
  updateMaxMark: (field: 'internal1' | 'internal2' | 'attendance', value: number) => Promise<void>;
  saveAttendance: () => Promise<{ success: boolean; errors: string[]; enteredCount?: number }>;
  saveInternal1: (subject?: string) => Promise<{ success: boolean; errors: string[]; enteredCount?: number }>;
  saveInternal2: (subject?: string) => Promise<{ success: boolean; errors: string[]; enteredCount?: number }>;
  getStudentRecord: (studentId: string) => StudentRecord | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, role, user } = useAuth();
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [maxMarks, setMaxMarks] = useState<MaxMarksConfig>(MAX_MARKS);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a reference of records originally loaded from Supabase so we know existing saved values
  const initialDbRecordsRef = useRef<Map<string, { attendance: number | null; internal1: SubjectMarksMap; internal2: SubjectMarksMap }>>(new Map());

  // ── Load Data from Supabase according to Role ──
  const loadData = useCallback(async () => {
    if (!isAuthenticated || !role || !user) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch max marks config
      const { data: maxRows, error: maxErr } = await supabase
        .from('max_marks_config')
        .select('exam_type, maximum');

      if (!maxErr && maxRows && maxRows.length > 0) {
        const newMax: MaxMarksConfig = { ...MAX_MARKS };
        maxRows.forEach((r) => {
          const typeStr = (r.exam_type || '').toLowerCase();
          const val = Number(r.maximum);
          if (!isNaN(val) && val > 0) {
            if (typeStr.includes('1')) newMax.internal1 = val;
            else if (typeStr.includes('2')) newMax.internal2 = val;
            else if (typeStr.includes('attend')) newMax.attendance = val;
          }
        });
        setMaxMarks(newMax);
      }

      if (role === 'faculty') {
        // Faculty: Read all 60 students, all attendance, all marks
        const [studentsRes, attRes, marksRes] = await Promise.all([
          supabase.from('students').select('sno, student_id, name, department').order('sno', { ascending: true }),
          supabase.from('attendance').select('student_id, percentage'),
          supabase.from('student_marks').select('id, student_id, subject, exam_type, marks'),
        ]);

        if (studentsRes.error) {
          throw new Error(`Failed to load students: ${studentsRes.error.message}`);
        }

        const studentRows = studentsRes.data || [];

        // Build attendance map
        const attMap = new Map<string, number | null>();
        if (attRes.data) {
          attRes.data.forEach((r) => {
            attMap.set(r.student_id, r.percentage !== null && r.percentage !== undefined ? Number(r.percentage) : null);
          });
        }

        // Build marks map
        const marksMap = new Map<string, { internal1: SubjectMarksMap; internal2: SubjectMarksMap }>();
        if (marksRes.data) {
          marksRes.data.forEach((r) => {
            if (!marksMap.has(r.student_id)) {
              marksMap.set(r.student_id, { internal1: {}, internal2: {} });
            }
            const stuMarks = marksMap.get(r.student_id)!;
            const examTypeStr = (r.exam_type || '').toLowerCase();
            const val = r.marks !== null && r.marks !== undefined ? Number(r.marks) : null;

            if (examTypeStr.includes('2')) {
              stuMarks.internal2[r.subject] = val;
            } else {
              stuMarks.internal1[r.subject] = val;
            }
          });
        }

        // Combine into StudentRecord[]
        const combinedRecords: StudentRecord[] = studentRows.map((stu) => {
          const stuMarks = marksMap.get(stu.student_id);
          const internal1: SubjectMarksMap = {};
          const internal2: SubjectMarksMap = {};

          SUBJECTS.forEach((subj) => {
            internal1[subj] = stuMarks?.internal1[subj] ?? null;
            internal2[subj] = stuMarks?.internal2[subj] ?? null;
          });

          const attendance = attMap.get(stu.student_id) ?? null;

          return {
            sno: stu.sno,
            studentId: stu.student_id,
            name: stu.name,
            attendance,
            internal1,
            internal2,
          };
        });

        // Cache initial values
        const dbCache = new Map();
        combinedRecords.forEach((r) => {
          dbCache.set(r.studentId, {
            attendance: r.attendance,
            internal1: { ...r.internal1 },
            internal2: { ...r.internal2 },
          });
        });
        initialDbRecordsRef.current = dbCache;

        setRecords(combinedRecords);
      } else {
        // Student: Read only own profile, attendance, and marks
        const studentId = user.id;

        const [studentRes, attRes, marksRes] = await Promise.all([
          supabase.from('students').select('sno, student_id, name, department').eq('student_id', studentId).maybeSingle(),
          supabase.from('attendance').select('student_id, percentage').eq('student_id', studentId).maybeSingle(),
          supabase.from('student_marks').select('id, student_id, subject, exam_type, marks').eq('student_id', studentId),
        ]);

        if (studentRes.error) {
          console.warn('[DataContext] Student record query warning:', studentRes.error.message);
        }

        const stu = studentRes.data || {
          sno: 1,
          student_id: studentId,
          name: user.name,
          department: user.department,
        };

        const internal1: SubjectMarksMap = {};
        const internal2: SubjectMarksMap = {};
        SUBJECTS.forEach((subj) => {
          internal1[subj] = null;
          internal2[subj] = null;
        });

        if (marksRes.data) {
          marksRes.data.forEach((r) => {
            const examTypeStr = (r.exam_type || '').toLowerCase();
            const val = r.marks !== null && r.marks !== undefined ? Number(r.marks) : null;
            if (examTypeStr.includes('2')) {
              internal2[r.subject] = val;
            } else {
              internal1[r.subject] = val;
            }
          });
        }

        const attendance =
          attRes.data && attRes.data.percentage !== null && attRes.data.percentage !== undefined
            ? Number(attRes.data.percentage)
            : null;

        const singleRecord: StudentRecord = {
          sno: stu.sno,
          studentId: stu.student_id,
          name: stu.name,
          attendance,
          internal1,
          internal2,
        };

        const dbCache = new Map();
        dbCache.set(singleRecord.studentId, {
          attendance: singleRecord.attendance,
          internal1: { ...singleRecord.internal1 },
          internal2: { ...singleRecord.internal2 },
        });
        initialDbRecordsRef.current = dbCache;

        setRecords([singleRecord]);
      }
    } catch (err: any) {
      console.error('[DataContext] Error loading Supabase data:', err);
      setError(err?.message || 'Failed to load records from Supabase.');
      // Fallback clean template in case of offline/network failure
      setRecords(generateStudentRecords());
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, role, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Local In-Memory Updates (prior to saving) ──
  const updateAttendance = useCallback((sno: number, value: number | null) => {
    setRecords((prev) => prev.map((r) => (r.sno === sno ? { ...r, attendance: value } : r)));
  }, []);

  const updateInternal1 = useCallback((sno: number, subject: string, value: number | null) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.sno !== sno) return r;
        return {
          ...r,
          internal1: {
            ...r.internal1,
            [subject]: value,
          },
        };
      })
    );
  }, []);

  const updateInternal2 = useCallback((sno: number, subject: string, value: number | null) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.sno !== sno) return r;
        return {
          ...r,
          internal2: {
            ...r.internal2,
            [subject]: value,
          },
        };
      })
    );
  }, []);

  const updateMaxMark = useCallback(
    async (field: 'internal1' | 'internal2' | 'attendance', value: number) => {
      const validVal = Math.max(1, Math.min(999, Math.round(value)));
      setMaxMarks((prev) => ({ ...prev, [field]: validVal }));

      try {
        const { error: updErr } = await supabase
          .from('max_marks_config')
          .update({ maximum: validVal })
          .eq('exam_type', field);

        if (updErr) {
          // If row did not exist yet, upsert
          await supabase.from('max_marks_config').upsert({ exam_type: field, maximum: validVal });
        }
      } catch (err) {
        console.error('[DataContext] Error updating max mark in Supabase:', err);
      }
    },
    []
  );

  // ── Save Attendance to Supabase ──
  const saveAttendance = useCallback(async (): Promise<{
    success: boolean;
    errors: string[];
    enteredCount?: number;
  }> => {
    const errors: string[] = [];
    let enteredCount = 0;

    // 1. Validation
    records.forEach((r) => {
      if (r.attendance !== null && r.attendance !== undefined) {
        enteredCount++;
        if (r.attendance < 0 || r.attendance > maxMarks.attendance) {
          errors.push(
            `${r.name} (S.No ${r.sno}): Attendance ${r.attendance}% is out of valid range (0–${maxMarks.attendance}%)`
          );
        }
      }
    });

    if (errors.length > 0) return { success: false, errors };

    // 2. Save each student's entered record separately
    // Unentered values remain NULL; existing saved values must not be overwritten by blanks
    for (const r of records) {
      if (r.attendance !== null && r.attendance !== undefined) {
        try {
          const { error: updErr } = await supabase
            .from('attendance')
            .update({
              percentage: r.attendance,
              updated_at: new Date().toISOString(),
            })
            .eq('student_id', r.studentId);

          if (updErr) {
            errors.push(`Failed to save attendance for ${r.name} (${r.studentId}): ${updErr.message}`);
          } else {
            // Update cache
            const cached = initialDbRecordsRef.current.get(r.studentId);
            if (cached) cached.attendance = r.attendance;
          }
        } catch (err: any) {
          errors.push(`Network error saving attendance for ${r.name}: ${err?.message}`);
        }
      }
    }

    return { success: errors.length === 0, errors, enteredCount };
  }, [records, maxMarks.attendance]);

  // ── Save Internal 1 Marks to Supabase ──
  const saveInternal1 = useCallback(
    async (subject?: string): Promise<{ success: boolean; errors: string[]; enteredCount?: number }> => {
      const errors: string[] = [];
      let enteredCount = 0;

      // 1. Validation
      records.forEach((r) => {
        const subjs = subject ? [subject] : SUBJECTS;
        subjs.forEach((subj) => {
          const rawVal = r.internal1[subj];
          if (rawVal !== null && rawVal !== undefined && (rawVal as any) !== '') {
            enteredCount++;
            const num = Number(rawVal);
            if (isNaN(num) || num < 0 || num > maxMarks.internal1) {
              errors.push(
                `${r.name} (S.No ${r.sno}): Mark ${rawVal} for "${subj}" exceeds maximum allowed (${maxMarks.internal1})`
              );
            }
          }
        });
      });

      if (errors.length > 0) return { success: false, errors };

      // 2. Build upsert payloads matching exact schema:
      // student_id, exam_type: 'internal1', subject, marks (numeric value or null), updated_at
      const payloads: {
        student_id: string;
        exam_type: 'internal1';
        subject: string;
        marks: number | null;
        updated_at: string;
      }[] = [];

      for (const r of records) {
        const subjs = subject ? [subject] : SUBJECTS;
        for (const subj of subjs) {
          const rawVal = r.internal1[subj];
          const val =
            rawVal !== null && rawVal !== undefined && (rawVal as any) !== ''
              ? Number(rawVal)
              : null;

          payloads.push({
            student_id: r.studentId,
            exam_type: 'internal1',
            subject: subj,
            marks: val,
            updated_at: new Date().toISOString(),
          });
        }
      }

      try {
        const { error: upsertErr } = await supabase
          .from('student_marks')
          .upsert(payloads, { onConflict: 'student_id,exam_type,subject' });

        if (upsertErr) {
          errors.push(`Failed to save marks: ${upsertErr.message}`);
          return { success: false, errors };
        }

        // 3. Refresh UI from Supabase after successful save
        await loadData();
      } catch (err: any) {
        errors.push(`Network or server error saving marks: ${err?.message || 'Unknown error'}`);
        return { success: false, errors };
      }

      return { success: true, errors: [], enteredCount };
    },
    [records, maxMarks.internal1, loadData]
  );

  // ── Save Internal 2 Marks to Supabase ──
  const saveInternal2 = useCallback(
    async (subject?: string): Promise<{ success: boolean; errors: string[]; enteredCount?: number }> => {
      const errors: string[] = [];
      let enteredCount = 0;

      // 1. Validation
      records.forEach((r) => {
        const subjs = subject ? [subject] : SUBJECTS;
        subjs.forEach((subj) => {
          const rawVal = r.internal2[subj];
          if (rawVal !== null && rawVal !== undefined && (rawVal as any) !== '') {
            enteredCount++;
            const num = Number(rawVal);
            if (isNaN(num) || num < 0 || num > maxMarks.internal2) {
              errors.push(
                `${r.name} (S.No ${r.sno}): Mark ${rawVal} for "${subj}" exceeds maximum allowed (${maxMarks.internal2})`
              );
            }
          }
        });
      });

      if (errors.length > 0) return { success: false, errors };

      // 2. Build upsert payloads matching exact schema:
      // student_id, exam_type: 'internal2', subject, marks (numeric value or null), updated_at
      const payloads: {
        student_id: string;
        exam_type: 'internal2';
        subject: string;
        marks: number | null;
        updated_at: string;
      }[] = [];

      for (const r of records) {
        const subjs = subject ? [subject] : SUBJECTS;
        for (const subj of subjs) {
          const rawVal = r.internal2[subj];
          const val =
            rawVal !== null && rawVal !== undefined && (rawVal as any) !== ''
              ? Number(rawVal)
              : null;

          payloads.push({
            student_id: r.studentId,
            exam_type: 'internal2',
            subject: subj,
            marks: val,
            updated_at: new Date().toISOString(),
          });
        }
      }

      try {
        const { error: upsertErr } = await supabase
          .from('student_marks')
          .upsert(payloads, { onConflict: 'student_id,exam_type,subject' });

        if (upsertErr) {
          errors.push(`Failed to save marks: ${upsertErr.message}`);
          return { success: false, errors };
        }

        // 3. Refresh UI from Supabase after successful save
        await loadData();
      } catch (err: any) {
        errors.push(`Network or server error saving marks: ${err?.message || 'Unknown error'}`);
        return { success: false, errors };
      }

      return { success: true, errors: [], enteredCount };
    },
    [records, maxMarks.internal2, loadData]
  );

  const getStudentRecord = useCallback(
    (studentId: string): StudentRecord | undefined => {
      return records.find((r) => r.studentId === studentId);
    },
    [records]
  );

  return (
    <DataContext.Provider
      value={{
        records,
        maxMarks,
        loading,
        error,
        refreshData: loadData,
        updateAttendance,
        updateInternal1,
        updateInternal2,
        updateMaxMark,
        saveAttendance,
        saveInternal1,
        saveInternal2,
        getStudentRecord,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
};
