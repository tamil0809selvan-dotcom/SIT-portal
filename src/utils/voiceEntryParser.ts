// ──────────────────────────────────────────────
// Voice Entry Parser for Faculty Attendance and Marks
// Parses spoken student IDs/names, subjects, exam types, and marks/percentages
// ──────────────────────────────────────────────

import type { StudentRecord, SubjectName } from '../types';
import { normalizeTranscript, phoneticNorm } from './voiceCommands.ts';
import { generateStudentRecords } from '../data/demoData.ts';

export interface StudentMatchResult {
  status: 'exact' | 'ambiguous' | 'none';
  student: StudentRecord | null;
  candidates: StudentRecord[];
  queryTerm: string;
}

export interface ParsedVoiceEntry {
  rawTranscript: string;
  student: StudentRecord | null;
  candidateStudents: StudentRecord[];
  isStudentAmbiguous: boolean;
  ambiguousQuery?: string;
  entryType: 'attendance' | 'marks' | null;
  examType: 'internal1' | 'internal2' | null;
  subject: SubjectName | null;
  value: number | null;
  currentSavedValue: number | null;
  missingFields: ('student' | 'entryType' | 'examType' | 'subject' | 'value')[];
  isValid: boolean;
  validationError?: string;
}

// English & Tamil number word lookup table
const WORD_TO_NUMBER: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  // Tamil transliteration
  nooru: 100,
  thonnooru: 90,
  enbathu: 80,
  ezhubathu: 70,
  arubathu: 60,
  ambathu: 50,
  // Tamil Unicode
  'நூறு': 100,
  'தொண்ணூறு': 90,
  'எண்பது': 80,
  'எழுபது': 70,
  'அறுபது': 60,
  'ஐம்பது': 50,
};

/**
 * Extracts a numeric value from spoken text (e.g., "85", "eighty five", "90%", "85 marks"),
 * carefully distinguishing scores from student roll numbers and exam numbers ("Internal 1").
 */
export function extractNumericValue(text: string): number | null {
  // Convert % to ' percent ' before stripping punctuation
  const norm = text
    .toLowerCase()
    .replace(/%/g, ' percent ')
    .replace(/[,\-]/g, ' ');

  // 1. Look for numbers explicitly adjacent to "mark(s)" or "percentage" or "percent"
  // E.g. "85 marks", "85 percent", "marks 85", "percentage 95", "score 90"
  const explicitMarks =
    norm.match(/\b(\d{1,3})\s*(?:marks?|percent|percentage)\b/) ||
    norm.match(/\b(?:marks?|percentage|percent|score|val|value)\s*[:=]?\s*(\d{1,3})\b/);
  if (explicitMarks) {
    const num = parseInt(explicitMarks[1], 10);
    if (!isNaN(num) && num >= 0 && num <= 100) return num;
  }

  // 2. Strip out exam identifiers ("internal 1", "exam 2") and student IDs ("stu 2024001", "student 5")
  // so those numbers are not confused with the score/percentage!
  const stripped = norm
    .replace(/\b(?:internal|exam)\s*(?:1|2|one|two)\b/g, ' ')
    .replace(/\bstu\s*(?:2024)?\s*\d{1,3}\b/g, ' ')
    .replace(/\b(?:student|sno|roll|en)\s*\d{1,3}\b/g, ' ');

  // Look for remaining standalone digits in stripped text
  const digitMatches = [...stripped.matchAll(/\b(\d{1,3})\b/g)];
  if (digitMatches.length > 0) {
    // Take the last candidate digit
    for (let i = digitMatches.length - 1; i >= 0; i--) {
      const num = parseInt(digitMatches[i][1], 10);
      if (!isNaN(num) && num >= 0 && num <= 100) {
        return num;
      }
    }
  }

  // 3. Look for compound words (e.g., "eighty five", "seventy two", "nooru")
  const tokens = stripped.split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const w1 = tokens[i];
    if (w1 === 'hundred' || w1 === 'nooru' || w1 === 'நூறு') {
      return 100;
    }

    if (WORD_TO_NUMBER[w1] !== undefined && WORD_TO_NUMBER[w1] >= 20) {
      const tens = WORD_TO_NUMBER[w1];
      const w2 = tokens[i + 1];
      if (w2 && WORD_TO_NUMBER[w2] !== undefined && WORD_TO_NUMBER[w2] < 10) {
        return tens + WORD_TO_NUMBER[w2];
      }
      return tens;
    }

    if (WORD_TO_NUMBER[w1] !== undefined) {
      return WORD_TO_NUMBER[w1];
    }
  }

  return null;
}

/**
 * Robust student matcher:
 * 1. Matches by student ID / roll number (STU2024001, stu 1, roll 1)
 * 2. Matches by full name, first name, and surname variations (e.g. "Karthick Rajan", "Karthik")
 * 3. Handles initials sensibly (e.g. "Karthick Rajan M" matches "Karthick Rajan")
 * 4. Identifies ambiguous matches (e.g. "Kumar" matching 9 students) without guessing silently.
 */
export function matchStudents(queryText: string, records: StudentRecord[]): StudentMatchResult {
  const norm = phoneticNorm(queryText);
  // Ensure we have records even if initial data is loading
  const studentList = records && records.length > 0 ? records : generateStudentRecords();

  // 1. Check for Student ID / roll number: e.g. "stu 2024 001", "stu 1", "student 5", "sno 12"
  const idMatch =
    norm.match(/\bstu\s*(?:2024)?\s*(\d{1,3})\b/) ||
    norm.match(/\b(?:student|roll|sno)\s*(\d{1,3})\b/);
  if (idMatch) {
    const sno = parseInt(idMatch[1], 10);
    const targetId = `STU2024${String(sno).padStart(3, '0')}`;
    const found = studentList.find((r) => r.sno === sno || r.studentId === targetId);
    if (found) {
      return { status: 'exact', student: found, candidates: [found], queryTerm: found.studentId };
    }
  }

  // 2. Search by core name and name tokens across all records
  const coreMatches: StudentRecord[] = [];
  const tokenMatches: StudentRecord[] = [];

  for (const r of studentList) {
    const fullNormalized = phoneticNorm(r.name);
    // Core name is name without the single trailing initial (e.g. "Karthick Rajan M" -> "Karthick Rajan")
    const coreName = fullNormalized.replace(/\s+[a-z]$/i, '').trim();
    const tokens = coreName.split(' ').filter((t) => t.length > 2);

    if (norm.includes(coreName)) {
      coreMatches.push(r);
    } else {
      // Check if any significant token matches as a distinct word in the transcript
      const matchedToken = tokens.find((t) => {
        const regex = new RegExp(`\\b${t}\\b`, 'i');
        return regex.test(norm);
      });
      if (matchedToken) {
        tokenMatches.push(r);
      }
    }
  }

  // Priority 1: Full core name match
  if (coreMatches.length === 1) {
    return { status: 'exact', student: coreMatches[0], candidates: coreMatches, queryTerm: coreMatches[0].name };
  }
  if (coreMatches.length > 1) {
    return { status: 'ambiguous', student: null, candidates: coreMatches, queryTerm: 'multiple students' };
  }

  // Priority 2: Distinct token / partial name match
  if (tokenMatches.length === 1) {
    return { status: 'exact', student: tokenMatches[0], candidates: tokenMatches, queryTerm: tokenMatches[0].name };
  }
  if (tokenMatches.length > 1) {
    return { status: 'ambiguous', student: null, candidates: tokenMatches, queryTerm: 'multiple students' };
  }

  return { status: 'none', student: null, candidates: [], queryTerm: '' };
}

/**
 * Resolves subject from transcript against the six core subjects.
 */
export function resolveSubject(text: string): SubjectName | null {
  const norm = normalizeTranscript(text);

  if (norm.includes('discrete') || norm.includes('math') || norm.includes('டிஸ்கிரீட்')) {
    return 'Discrete Mathematics';
  }
  if (
    norm.includes('data structure') ||
    norm.includes('data structures') ||
    norm.includes('டேட்டா ஸ்ட்ரக்சர்') ||
    /\bds\b/.test(norm)
  ) {
    return 'Data Structure';
  }
  if (
    norm.includes('python') ||
    norm.includes('object oriented') ||
    norm.includes('oops') ||
    norm.includes('oop') ||
    norm.includes('பைதான்')
  ) {
    return 'Object Oriented Programming Using Python';
  }
  if (
    norm.includes('computer organisation') ||
    norm.includes('computer organization') ||
    norm.includes('architecture') ||
    /\bco\b/.test(norm) ||
    norm.includes('organisation') ||
    norm.includes('organization') ||
    norm.includes('கம்ப்யூட்டர் ஆர்கனைசேஷன்')
  ) {
    return 'Computer Organisation';
  }
  if (
    norm.includes('operating system') ||
    norm.includes('operating systems') ||
    /\bos\b/.test(norm) ||
    norm.includes('ஆப்பரேட்டிங் சிஸ்டம்')
  ) {
    return 'Operating System';
  }
  if (
    norm.includes('database') ||
    norm.includes('dbms') ||
    norm.includes('db design') ||
    norm.includes('டேட்டாபேஸ்')
  ) {
    return 'Database System Design';
  }

  return null;
}

/**
 * Resolves exam type from transcript (Internal 1 vs Internal 2).
 */
export function resolveExamType(text: string): 'internal1' | 'internal2' | null {
  const norm = normalizeTranscript(text);

  if (
    norm.includes('internal 2') ||
    norm.includes('internal two') ||
    norm.includes('second internal') ||
    norm.includes('exam 2') ||
    norm.includes('இரண்டாம் தேர்வு') ||
    norm.includes('இன்டர்னல் 2')
  ) {
    return 'internal2';
  }

  if (
    norm.includes('internal 1') ||
    norm.includes('internal one') ||
    norm.includes('first internal') ||
    norm.includes('exam 1') ||
    norm.includes('முதல் தேர்வு') ||
    norm.includes('இன்டர்னல் 1')
  ) {
    return 'internal1';
  }

  return null;
}

export interface VoiceEntryContext {
  currentPagePath?: string;
  selectedSubject?: SubjectName;
  examNumber?: 1 | 2;
}

/**
 * Main voice data entry parser.
 * Accurately parses student, entryType, examType, subject, and value.
 * Never guesses ambiguous or missing data.
 */
export function parseVoiceEntry(
  transcript: string,
  records: StudentRecord[],
  context?: VoiceEntryContext
): ParsedVoiceEntry {
  const norm = normalizeTranscript(transcript);

  // 1. Resolve Student using the robust matcher
  const matchResult = matchStudents(transcript, records);
  const student = matchResult.student;
  const isStudentAmbiguous = matchResult.status === 'ambiguous';
  const candidateStudents = matchResult.candidates;

  // 2. Resolve Entry Type (Attendance vs Marks)
  let entryType: 'attendance' | 'marks' | null = null;
  if (
    norm.includes('attendance') ||
    norm.includes('attendence') ||
    norm.includes('varugai') ||
    norm.includes('வருகை') ||
    norm.includes('percent') ||
    norm.includes('%') ||
    context?.currentPagePath?.includes('attendance')
  ) {
    entryType = 'attendance';
  } else if (
    norm.includes('mark') ||
    norm.includes('marks') ||
    norm.includes('internal') ||
    norm.includes('மதிப்பெண்') ||
    context?.currentPagePath?.includes('internal')
  ) {
    entryType = 'marks';
  }

  // 3. Resolve Exam Type & Subject (if marks entry)
  let examType: 'internal1' | 'internal2' | null = null;
  let subject: SubjectName | null = null;

  if (entryType === 'marks') {
    examType = resolveExamType(norm);
    if (!examType && context?.examNumber) {
      examType = context.examNumber === 2 ? 'internal2' : 'internal1';
    }

    subject = resolveSubject(norm);
    if (!subject && context?.selectedSubject) {
      subject = context.selectedSubject;
    }
  }

  // 4. Resolve Value (Marks or Attendance Percentage)
  const value = extractNumericValue(norm);

  // 5. Look up current saved value in database/records
  let currentSavedValue: number | null = null;
  if (student) {
    if (entryType === 'attendance') {
      currentSavedValue = student.attendance;
    } else if (entryType === 'marks' && subject && examType) {
      currentSavedValue = examType === 'internal1' ? student.internal1?.[subject] ?? null : student.internal2?.[subject] ?? null;
    }
  }

  // 6. Check Missing Fields
  const missingFields: ('student' | 'entryType' | 'examType' | 'subject' | 'value')[] = [];

  if (!student) missingFields.push('student');
  if (!entryType) missingFields.push('entryType');
  if (entryType === 'marks') {
    if (!examType) missingFields.push('examType');
    if (!subject) missingFields.push('subject');
  }
  if (value === null || isNaN(value)) missingFields.push('value');

  // 7. Validation
  let isValid = missingFields.length === 0;
  let validationError: string | undefined;

  if (value !== null) {
    if (value < 0 || value > 100) {
      isValid = false;
      validationError = `Value ${value} is out of valid range (0–100).`;
    }
  }

  return {
    rawTranscript: transcript,
    student,
    candidateStudents,
    isStudentAmbiguous,
    ambiguousQuery: matchResult.queryTerm,
    entryType,
    examType,
    subject,
    value,
    currentSavedValue,
    missingFields,
    isValid,
    validationError,
  };
}
