// ──────────────────────────────────────────────
// Types for SIT College Portal
// ──────────────────────────────────────────────

export type UserRole = 'student' | 'faculty';

export interface User {
  id: string;
  name: string;
  password?: string;
  role: UserRole;
  department: string;
  avatar?: string;
}

export interface StudentUser extends User {
  role: 'student';
  year: number;
  semester: number;
  section: string;
  email: string;
  phone: string;
  dob: string;
  bloodGroup: string;
  parentName: string;
  parentPhone: string;
  admissionYear: number;
  cgpa: number;
}

export interface FacultyUser extends User {
  role: 'faculty';
  designation: string;
  qualification: string;
  email: string;
  phone: string;
  experience: string;
  specialization: string;
  joinYear: number;
}

export const SUBJECTS = [
  'Discrete Mathematics',
  'Data Structure',
  'Object Oriented Programming Using Python',
  'Computer Organisation',
  'Operating System',
  'Database System Design',
] as const;

export type SubjectName = (typeof SUBJECTS)[number];

export type SubjectMarksMap = Record<string, number | null>;

export interface StudentRecord {
  sno: number;
  studentId: string;
  name: string;
  attendance: number | null;
  internal1: SubjectMarksMap;
  internal2: SubjectMarksMap;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'info' | 'warning' | 'success';
}

export interface MaxMarksConfig {
  internal1: number;
  internal2: number;
  attendance: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: StudentUser | FacultyUser | null;
  role: UserRole | null;
  loading: boolean;
  error?: string | null;
}

// ── Supabase Database Row Types ──────────────
export interface UserProfileRow {
  user_id: string;
  role: UserRole;
  student_id: string | null;
  created_at?: string;
}

export interface StudentRow {
  sno: number;
  student_id: string;
  name: string;
  department: string;
}

export interface AttendanceRow {
  student_id: string;
  percentage: number | null;
  updated_at?: string;
}

export interface StudentMarkRow {
  id?: string | number;
  student_id: string;
  subject: string;
  exam_type: string;
  marks: number | null;
  updated_at?: string;
}

export interface MaxMarksConfigRow {
  exam_type: string;
  maximum: number;
}
