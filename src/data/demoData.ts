// ──────────────────────────────────────────────
// Demo data: credentials, students, notifications
// ──────────────────────────────────────────────

import { StudentUser, FacultyUser, StudentRecord, Notification, SUBJECTS, SubjectMarksMap } from '../types';

export { SUBJECTS };

// ── Demo Credentials ─────────────────────────
export const DEMO_STUDENT: StudentUser = {
  id: 'STU2024001',
  name: 'Karthick Rajan M',
  password: 'student123',
  role: 'student',
  department: 'Computer Science and Engineering',
  year: 3,
  semester: 5,
  section: 'A',
  email: 'karthick.rajan@sit.edu',
  phone: '9876543210',
  dob: '2004-05-15',
  bloodGroup: 'O+',
  parentName: 'Rajan M',
  parentPhone: '9876543211',
  admissionYear: 2022,
  cgpa: 8.74,
};

export const DEMO_FACULTY: FacultyUser = {
  id: 'FAC2020015',
  name: 'Dr. Priya Dharshini S',
  password: 'faculty123',
  role: 'faculty',
  department: 'Computer Science and Engineering',
  designation: 'Associate Professor',
  qualification: 'Ph.D. in Computer Science',
  email: 'priya.dharshini@sit.edu',
  phone: '9123456780',
  experience: '12 Years',
  specialization: 'Machine Learning & Data Science',
  joinYear: 2012,
};

// ── 60 Fictional Students ─────────────────────
export const studentNames = [
  'Karthick Rajan M', 'Abishek R', 'Ajay Kumar V', 'Ananya M', 'Aravind K',
  'Bala Murugan T', 'Bharathi P', 'Chandru S', 'Devi Priya R', 'Dharani K',
  'Elakkiya M', 'Ganesh Kumar P', 'Gayathri S', 'Hari Prasad V', 'Harini R',
  'Indhu M', 'Janani K', 'Aadhira S', 'Kavitha S', 'Keerthana R',
  'Lakshmi Priya T', 'Maha Lakshmi V', 'Manoj Kumar S', 'Meena K', 'Mohan Raj P',
  'Nandhini S', 'Nithya R', 'Pavithra M', 'Pradeep Kumar V', 'Preethi S',
  'Ragul K', 'Ramya S', 'Revathi M', 'Sakthi Vel P', 'Sangeetha R',
  'Saravanan T', 'Saritha K', 'Sathish Kumar M', 'Selva Kumar R', 'Sharmila V',
  'Siva Prakash K', 'Sneha M', 'Sri Devi P', 'Suresh Babu R', 'Tamil Selvi K',
  'Tharun Kumar V', 'Uma Maheswari S', 'Vanitha R', 'Vasanth Kumar M', 'Vignesh P',
  'Vinoth Kumar S', 'Yamini R', 'Yuvaraj K', 'Abinaya S', 'Deepak Raj M',
  'Ezhilarasi P', 'Gokul Raj V', 'Hemalatha S', 'Ilayaraja K', 'Jayanthi M',
];

/**
 * Generates initial 60 student records with all fields completely empty (null).
 * No prefilled or fake marks. No prefilled attendance.
 * All entries are entered and saved manually by faculty.
 */
export const generateStudentRecords = (): StudentRecord[] => {
  return studentNames.map((name, index) => {
    const studentId = `STU2024${String(index + 1).padStart(3, '0')}`;
    const internal1: SubjectMarksMap = {};
    const internal2: SubjectMarksMap = {};

    SUBJECTS.forEach((subject) => {
      internal1[subject] = null;
      internal2[subject] = null;
    });

    return {
      sno: index + 1,
      studentId,
      name,
      attendance: null,
      internal1,
      internal2,
    };
  });
};

// ── Notifications ─────────────────────────────
export const STUDENT_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    title: 'Internal Exam 1 Schedule',
    message: 'Internal Exam 1 schedule has been published. Check your syllabus and dates.',
    date: '2026-10-12',
    type: 'info',
  },
  {
    id: 'n2',
    title: 'Attendance Advisory',
    message: 'Minimum 75% attendance is required to be eligible for end semester exams.',
    date: '2026-10-10',
    type: 'warning',
  },
  {
    id: 'n3',
    title: 'Semester Fee Payment Reminder',
    message: 'Last date for semester fee payment is October 30, 2026.',
    date: '2026-10-08',
    type: 'info',
  },
];

export const FACULTY_NOTIFICATIONS: Notification[] = [
  {
    id: 'fn1',
    title: 'Marks Entry Portal Open',
    message: 'Faculty can enter marks for Internal Exam 1 and 2 across all six subjects.',
    date: '2026-10-13',
    type: 'info',
  },
  {
    id: 'fn2',
    title: 'Faculty Meeting',
    message: 'Department faculty meeting on October 18, 2026 at 3:00 PM in Conference Hall.',
    date: '2026-10-11',
    type: 'warning',
  },
];

// ── Max Marks Configuration ──────────────────
export const MAX_MARKS = {
  internal1: 100,
  internal2: 100,
  attendance: 100,
};
