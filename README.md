# SIT College Portal

A complete, responsive college portal website built with **React**, **TypeScript**, **Tailwind CSS**, **React Router**, and **Lucide React** icons.

## Features

### Student Portal
- **Dashboard**: Student profile card displayed immediately after login, quick access to attendance/marks, notifications
- **Attendance View**: Read-only attendance percentage with visual indicator
- **Internal Exam 1 & 2 Marks**: Read-only marks view with pass/fail status
- **Profile**: Complete student details
- **Settings**: Interface preferences

### Faculty Portal
- **Dashboard**: Faculty profile card displayed immediately after login, quick access cards, notifications
- **Attendance Entry**: Enter attendance percentage (0–100) for 60 students with validation
- **Internal Exam 1 & 2 Marks Entry**: Enter marks for 60 students with configurable max marks
- **Profile**: Complete faculty details
- **Settings**: Interface preferences

### Responsive Design
- Desktop: Persistent left sidebar + content area
- Mobile: Hamburger menu with slide-out sidebar
- Tables support horizontal scrolling on small screens
- Tested at 360px, 390px, 768px, 1366px, and 1920px widths

## Demo Credentials

| Role    | ID          | Password    |
|---------|-------------|-------------|
| Student | STU2024001  | student123  |
| Faculty | FAC2020015  | faculty123  |

## Installation

### Prerequisites
- Node.js 18+ and npm

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will open at `http://localhost:5173`.

## Project Structure

```
src/
├── components/          # Shared UI components
│   ├── DashboardLayout.tsx   # Sidebar + header layout wrapper
│   ├── Header.tsx            # Top navigation bar
│   └── Sidebar.tsx           # Collapsible sidebar navigation
├── context/             # React contexts
│   ├── AuthContext.tsx       # Authentication state management
│   └── DataContext.tsx       # Student records (attendance/marks)
├── data/                # Demo data and constants
│   └── demoData.ts          # Credentials, 60 students, notifications
├── pages/               # Page components
│   ├── HomePage.tsx          # Landing page with portal cards
│   ├── LoginPage.tsx         # Shared login (student/faculty)
│   ├── ProfilePage.tsx       # Profile details
│   ├── SettingsPage.tsx      # Interface settings
│   ├── student/
│   │   ├── StudentDashboard.tsx
│   │   ├── StudentAttendance.tsx
│   │   └── StudentMarksView.tsx
│   └── faculty/
│       ├── FacultyDashboard.tsx
│       ├── FacultyAttendance.tsx
│       └── FacultyMarksEntry.tsx
├── types/               # TypeScript type definitions
│   └── index.ts
├── App.tsx              # Route configuration
├── main.tsx             # Entry point
└── index.css            # Global styles + Tailwind
```

## Data Persistence

- **localStorage** is used for demo data persistence
- Authentication state persists across page refreshes
- Attendance and marks data is saved locally
- Designed for future Supabase backend integration

## Future Roadmap

- [ ] Tamil, Tanglish, and English voice navigation
- [ ] Voice entry for attendance and marks (faculty)
- [ ] Voice-based queries for attendance/marks (students)
- [ ] RAG integration for college documents
- [ ] Secure Supabase backend
- [ ] Dark mode theme

## Tech Stack

| Technology       | Purpose                    |
|-----------------|----------------------------|
| React 18        | UI framework               |
| TypeScript      | Type safety                |
| Tailwind CSS 3  | Utility-first styling      |
| React Router 6  | Client-side routing        |
| Lucide React    | Modern icon library        |
| Vite            | Build tool & dev server    |

## License

MIT
