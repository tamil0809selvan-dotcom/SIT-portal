// ──────────────────────────────────────────────
// Data Context: attendance & subject-wise marks with localStorage
// ──────────────────────────────────────────────

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { StudentRecord, MaxMarksConfig, SUBJECTS } from '../types';
import { generateStudentRecords, MAX_MARKS } from '../data/demoData';

interface DataContextType {
  records: StudentRecord[];
  maxMarks: MaxMarksConfig;
  updateAttendance: (sno: number, value: number | null) => void;
  updateInternal1: (sno: number, subject: string, value: number | null) => void;
  updateInternal2: (sno: number, subject: string, value: number | null) => void;
  updateMaxMark: (field: 'internal1' | 'internal2' | 'attendance', value: number) => void;
  saveAttendance: () => { success: boolean; errors: string[]; enteredCount?: number };
  saveInternal1: (subject?: string) => { success: boolean; errors: string[]; enteredCount?: number };
  saveInternal2: (subject?: string) => { success: boolean; errors: string[]; enteredCount?: number };
  getStudentRecord: (studentId: string) => StudentRecord | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Clean storage key ensuring no legacy sample arrays contaminate state
const RECORDS_KEY = 'sit_portal_records_clean_v1';
const MAX_MARKS_KEY = 'sit_portal_max_marks';

// Purge any legacy keys that previously held hardcoded sample arrays
const LEGACY_STORAGE_KEYS = [
  'sit_portal_records',
  'sit_portal_records_v1',
  'sit_portal_records_v2',
  'sit_portal_records_v3',
  'sit_portal_records_v4',
];

if (typeof window !== 'undefined' && window.localStorage) {
  try {
    LEGACY_STORAGE_KEYS.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/** Detects if data contains signatures of old hardcoded sample marks or attendance */
const containsLegacySampleData = (data: any[]): boolean => {
  if (!Array.isArray(data) || data.length === 0) return false;
  const r0 = data[0];
  const r1 = data[1];
  const r2 = data[2];

  // Old sample attendance signature: 77, 90, 79...
  if (r0?.attendance === 77 && r1?.attendance === 90 && r2?.attendance === 79) {
    return true;
  }
  // Old sample marks signature: 75, 82, 89...
  if (
    r0?.internal1?.['Discrete Mathematics'] === 75 &&
    r1?.internal1?.['Discrete Mathematics'] === 82
  ) {
    return true;
  }
  return false;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [records, setRecords] = useState<StudentRecord[]>(() => {
    try {
      const saved = localStorage.getItem(RECORDS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as any[];
        // If data is valid and not contaminated by legacy sample arrays, use it
        if (
          Array.isArray(parsed) &&
          parsed.length === 60 &&
          !containsLegacySampleData(parsed) &&
          parsed.every(
            (r) =>
              r.internal1 &&
              typeof r.internal1 === 'object' &&
              r.internal2 &&
              typeof r.internal2 === 'object' &&
              SUBJECTS.every((s) => s in r.internal1 && s in r.internal2)
          )
        ) {
          return parsed as StudentRecord[];
        }
      }
    } catch {
      /* ignore */
    }
    // Clean initial state: all 60 students with null (empty) attendance and null (empty) marks
    return generateStudentRecords();
  });

  const [maxMarks, setMaxMarks] = useState<MaxMarksConfig>(() => {
    try {
      const saved = localStorage.getItem(MAX_MARKS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as MaxMarksConfig;
        if (parsed && typeof parsed.internal1 === 'number' && typeof parsed.internal2 === 'number') {
          return parsed;
        }
      }
    } catch {
      /* ignore */
    }
    return MAX_MARKS;
  });

  useEffect(() => {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem(MAX_MARKS_KEY, JSON.stringify(maxMarks));
  }, [maxMarks]);

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

  const updateMaxMark = useCallback((field: 'internal1' | 'internal2' | 'attendance', value: number) => {
    const validVal = Math.max(1, Math.min(999, Math.round(value)));
    setMaxMarks((prev) => ({ ...prev, [field]: validVal }));
  }, []);

  const saveAttendance = useCallback((): { success: boolean; errors: string[]; enteredCount?: number } => {
    const errors: string[] = [];
    let enteredCount = 0;

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
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return { success: true, errors: [], enteredCount };
  }, [records, maxMarks.attendance]);

  const saveInternal1 = useCallback(
    (subject?: string): { success: boolean; errors: string[]; enteredCount?: number } => {
      const errors: string[] = [];
      let enteredCount = 0;

      records.forEach((r) => {
        if (subject) {
          const val = r.internal1[subject];
          if (val !== null && val !== undefined) {
            enteredCount++;
            if (val < 0 || val > maxMarks.internal1) {
              errors.push(
                `${r.name} (S.No ${r.sno}): Mark ${val} for "${subject}" exceeds maximum allowed (${maxMarks.internal1})`
              );
            }
          }
        } else {
          Object.entries(r.internal1).forEach(([subj, val]) => {
            if (val !== null && val !== undefined) {
              enteredCount++;
              if (val < 0 || val > maxMarks.internal1) {
                errors.push(
                  `${r.name} (S.No ${r.sno}): Mark ${val} for "${subj}" exceeds maximum allowed (${maxMarks.internal1})`
                );
              }
            }
          });
        }
      });

      if (errors.length > 0) return { success: false, errors };
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
      return { success: true, errors: [], enteredCount };
    },
    [records, maxMarks.internal1]
  );

  const saveInternal2 = useCallback(
    (subject?: string): { success: boolean; errors: string[]; enteredCount?: number } => {
      const errors: string[] = [];
      let enteredCount = 0;

      records.forEach((r) => {
        if (subject) {
          const val = r.internal2[subject];
          if (val !== null && val !== undefined) {
            enteredCount++;
            if (val < 0 || val > maxMarks.internal2) {
              errors.push(
                `${r.name} (S.No ${r.sno}): Mark ${val} for "${subject}" exceeds maximum allowed (${maxMarks.internal2})`
              );
            }
          }
        } else {
          Object.entries(r.internal2).forEach(([subj, val]) => {
            if (val !== null && val !== undefined) {
              enteredCount++;
              if (val < 0 || val > maxMarks.internal2) {
                errors.push(
                  `${r.name} (S.No ${r.sno}): Mark ${val} for "${subj}" exceeds maximum allowed (${maxMarks.internal2})`
                );
              }
            }
          });
        }
      });

      if (errors.length > 0) return { success: false, errors };
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
      return { success: true, errors: [], enteredCount };
    },
    [records, maxMarks.internal2]
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
