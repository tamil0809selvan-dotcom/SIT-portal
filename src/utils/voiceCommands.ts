// ──────────────────────────────────────────────
// Voice Command Intent Parser
// Supports Tamil, Tanglish, and English commands for SIT Portal Navigation
// ──────────────────────────────────────────────

import type { UserRole } from '../types';

export interface VoiceIntentResult {
  matched: boolean;
  action: 'navigate' | 'logout' | 'unknown';
  path?: string;
  label: string;
  confidenceMessage?: string;
}

/**
 * Normalizes voice transcript by removing punctuation, extra spaces, and converting to lowercase.
 */
export function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?'"“”]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Phonetic normalization for Indian names and common spoken variations.
 */
export function phoneticNorm(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b(?:karthik|kartik|karthick)\b/g, 'karthick')
    .replace(/\b(?:abhishek|abisek)\b/g, 'abishek')
    .replace(/\b(?:shakthi|shakti|sakthivel)\b/g, 'sakthi')
    .replace(/\b(?:satish|satheesh)\b/g, 'sathish')
    .replace(/\b(?:rahul|raghul)\b/g, 'ragul')
    .replace(/\b(?:vinod|vinothkumar)\b/g, 'vinoth')
    .replace(/\b(?:prithi|preeti)\b/g, 'preethi')
    .replace(/\b(?:gayatri)\b/g, 'gayathri')
    .replace(/\b(?:tarani|tharani)\b/g, 'dharani')
    .replace(/\b(?:tarun|tharunkumar)\b/g, 'tharun')
    .replace(/\b(?:deepak|deepakraj)\b/g, 'deepak')
    .replace(/\b(?:gokul|gokulraj)\b/g, 'gokul')
    .replace(/\b(?:mohan|mohanraj)\b/g, 'mohan')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?'"“”]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determines whether a spoken phrase is intended for Data Entry (editing attendance/marks)
 * versus pure Navigation (opening pages).
 * Navigation commands (e.g., "Attendance page open pannu", "Open Internal Exam 1")
 * must NEVER be confused with data entry commands.
 */
export function isDataEntryCommand(rawText: string): boolean {
  const norm = normalizeTranscript(rawText);

  // If text contains an explicit numeric assignment:
  // e.g. "85 marks", "92 percent", "85%", "marks 85", "attendance 92", "score 90"
  const hasScoreAssignment =
    /\b\d{1,3}\s*(?:marks?|percent|percentage|%)\b/i.test(norm) ||
    /\b(?:marks?|percentage|score)\s*[:=]?\s*\d{1,3}\b/i.test(norm) ||
    /\b(?:student|stu)\b.*\b\d{1,3}\b/i.test(norm);

  // Check if text is an explicit navigation command (e.g., "open...", "go to...", "...page-ku po", "...page open pannu")
  const isExplicitNavigation =
    /^(?:open|go to|take me to|navigate to|show me)\s+(?:the\s+)?(?:page|dashboard|attendance|internal|marks|profile|settings)\b/i.test(norm) ||
    /(?:page-ku po|page open pannu|ku po|ponga|open pannu|open pannunga)$/i.test(norm);

  // If it's a navigation command AND doesn't have an explicit score assignment, it is purely navigation
  if (isExplicitNavigation && !hasScoreAssignment) {
    return false;
  }

  // If there's an explicit score assignment, it is data entry
  if (hasScoreAssignment) {
    return true;
  }

  // If phrase explicitly starts with "student [name]..." and contains data/value keywords
  if (/^student\s+[a-z]+/i.test(norm) && (norm.includes('mark') || norm.includes('attendance') || norm.includes('percent'))) {
    return true;
  }

  return false;
}

/**
 * Resolves recognized voice transcript to a role-based navigation route.
 * Strictly respects student / faculty roles and does NOT invent routes.
 */
export function resolveVoiceIntent(
  rawTranscript: string,
  role: UserRole | null
): VoiceIntentResult {
  const text = normalizeTranscript(rawTranscript);

  if (!text) {
    return {
      matched: false,
      action: 'unknown',
      label: 'Empty',
      confidenceMessage: 'No speech recognized. Please try speaking again.',
    };
  }

  // If user is not authenticated or role is undefined, block navigation
  if (!role) {
    return {
      matched: false,
      action: 'unknown',
      label: 'Unauthorized',
      confidenceMessage: 'Please log in to use voice navigation.',
    };
  }

  const basePath = role === 'faculty' ? '/faculty' : '/student';

  // ── 1. Logout Intent ──
  // English: logout, log out, sign out, exit
  // Tanglish: logout pannu, veliye po, veliya po, signout pannu
  // Tamil: வெளியேறு, லாக் அவுட், வெளியே போ
  const isLogout =
    /\b(logout|log out|sign out|signout|exit)\b/.test(text) ||
    text.includes('veliye') ||
    text.includes('veliya') ||
    text.includes('வெளியேறு') ||
    text.includes('வெளியே') ||
    text.includes('லாக் அவுட்');

  if (isLogout) {
    return {
      matched: true,
      action: 'logout',
      label: 'Logout',
      confidenceMessage: 'Logging out from SIT Portal…',
    };
  }

  // ── 2. Attendance Intent ──
  // English: attendance, attendence, presence
  // Tanglish: attendance page-ku po, attendance page open pannu, attendance ku po, attendance open pannu, varugai
  // Tamil: வருகை, வருகைப்பதிவு, அட்டெண்டன்ஸ்
  const isAttendance =
    /\b(attendance|attendence|attandance)\b/.test(text) ||
    text.includes('varugai') ||
    text.includes('வருகை') ||
    text.includes('அட்டெண்டன்ஸ்');

  if (isAttendance) {
    return {
      matched: true,
      action: 'navigate',
      path: `${basePath}/attendance`,
      label: 'Attendance',
      confidenceMessage: 'Navigating to Attendance page…',
    };
  }

  // ── 3. Internal Exam 2 Intent (checked before general marks) ──
  // English: open internal exam 2, internal 2, internal two, internal exam 2, second internal, exam 2
  // Tanglish: internal exam 2 page-ku po, internal 2 ku po, internal 2 open pannu, irandam internal
  // Tamil: இன்டர்னல் 2, இன்டெர்னல் 2, இரண்டாம் தேர்வு
  const isInternal2 =
    /\b(internal\s*(2|two)|internal\s*exam\s*(2|two)|second\s*internal|exam\s*2)\b/.test(text) ||
    text.includes('internal 2') ||
    text.includes('internal two') ||
    text.includes('irandam internal') ||
    text.includes('இரண்டாம்');

  if (isInternal2) {
    return {
      matched: true,
      action: 'navigate',
      path: `${basePath}/internal2`,
      label: 'Internal Exam 2',
      confidenceMessage: 'Navigating to Internal Exam 2…',
    };
  }

  // ── 4. Internal Exam 1 Intent ──
  // English: open internal exam 1, internal 1, internal one, internal exam 1, first internal, exam 1
  // Tanglish: internal exam 1 page-ku po, internal 1 ku po, muthal internal, first internal ku po
  // Tamil: இன்டர்னல் 1, இன்டெர்னல் 1, முதல் தேர்வு
  const isInternal1 =
    /\b(internal\s*(1|one)|internal\s*exam\s*(1|one)|first\s*internal|exam\s*1)\b/.test(text) ||
    text.includes('internal 1') ||
    text.includes('internal one') ||
    text.includes('muthal internal') ||
    text.includes('முதல் தேர்வு');

  if (isInternal1) {
    return {
      matched: true,
      action: 'navigate',
      path: `${basePath}/internal1`,
      label: 'Internal Exam 1',
      confidenceMessage: 'Navigating to Internal Exam 1…',
    };
  }

  // ── 5. General Marks Intent ──
  // English: open marks, marks page, grades, score, results
  // Tanglish: marks page open pannu, marks page-ku po, marks ku po, marks open pannu, madhippengal
  // Tamil: மதிப்பெண், மதிப்பெண்கள், மார்க்ஸ்
  const isMarks =
    /\b(marks|mark|score|scores|grade|grades|result|results)\b/.test(text) ||
    text.includes('madhippen') ||
    text.includes('மதிப்பெண்') ||
    text.includes('மார்க்');

  if (isMarks) {
    return {
      matched: true,
      action: 'navigate',
      path: `${basePath}/internal1`,
      label: 'Marks (Internal 1)',
      confidenceMessage: 'Navigating to Marks…',
    };
  }

  // ── 6. Profile Intent ──
  // English: profile, my profile, user profile, details, my details, account
  // Tanglish: profile page open pannu, profile-ku po, en profile, profile kaatu
  // Tamil: சுயவிவரம், என் விவரம், புரோஃபைல்
  const isProfile =
    /\b(profile|account|my profile|details|my details)\b/.test(text) ||
    text.includes('profile') ||
    text.includes('சுயவிவரம்') ||
    text.includes('புரோஃபைல்');

  if (isProfile) {
    return {
      matched: true,
      action: 'navigate',
      path: `${basePath}/profile`,
      label: 'Profile',
      confidenceMessage: 'Navigating to Profile page…',
    };
  }

  // ── 7. Settings Intent ──
  // English: settings, setting, preferences, configuration
  // Tanglish: settings-ku po, settings open pannu
  // Tamil: அமைப்புகள், அமைப்பு, செட்டிங்ஸ்
  const isSettings =
    /\b(settings|setting|preferences|config)\b/.test(text) ||
    text.includes('settings') ||
    text.includes('அமைப்புகள்') ||
    text.includes('செட்டிங்ஸ்');

  if (isSettings) {
    return {
      matched: true,
      action: 'navigate',
      path: `${basePath}/settings`,
      label: 'Settings',
      confidenceMessage: 'Navigating to Settings page…',
    };
  }

  // ── 8. Dashboard / Home Intent ──
  // English: dashboard, home, main, overview
  // Tanglish: dashboard-ku po, dashboard open pannu, home-ku po, mudhal pakkam
  // Tamil: முகப்பு, டாஷ்போர்டு
  const isDashboard =
    /\b(dashboard|dash board|home|main|overview)\b/.test(text) ||
    text.includes('dashboard') ||
    text.includes('mudhal pakkam') ||
    text.includes('முகப்பு') ||
    text.includes('டாஷ்போர்டு');

  if (isDashboard) {
    return {
      matched: true,
      action: 'navigate',
      path: `${basePath}/dashboard`,
      label: 'Dashboard',
      confidenceMessage: 'Navigating to Dashboard…',
    };
  }

  // Unknown command
  return {
    matched: false,
    action: 'unknown',
    label: 'Unknown',
    confidenceMessage: `Command not recognized from "${rawTranscript}". Try saying "Open Internal Exam 1" or "Attendance page open pannu".`,
  };
}
