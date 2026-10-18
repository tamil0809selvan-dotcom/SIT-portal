
import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';

import StudentDashboard from './pages/student/StudentDashboard';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentMarksView from './pages/student/StudentMarksView';

import FacultyDashboard from './pages/faculty/FacultyDashboard';
import FacultyAttendance from './pages/faculty/FacultyAttendance';
import FacultyMarksEntry from './pages/faculty/FacultyMarksEntry';

import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="Portal System Recovery">
      <AuthProvider>
        <DataProvider>
          <BrowserRouter>
            <Routes>
              {/* Home page */}
              <Route path="/" element={<HomePage />} />

            {/* Login pages */}
            <Route
              path="/student/login"
              element={<LoginPage role="student" />}
            />

            <Route
              path="/faculty/login"
              element={<LoginPage role="faculty" />}
            />

            {/* Student pages */}
            <Route
              element={<DashboardLayout requiredRole="student" />}
            >
              <Route
                path="/student/dashboard"
                element={<StudentDashboard />}
              />

              <Route
                path="/student/attendance"
                element={<StudentAttendance />}
              />

              <Route
                path="/student/internal1"
                element={<StudentMarksView examNumber={1} />}
              />

              <Route
                path="/student/internal2"
                element={<StudentMarksView examNumber={2} />}
              />

              <Route
                path="/student/profile"
                element={<ProfilePage />}
              />

              <Route
                path="/student/settings"
                element={<SettingsPage />}
              />
            </Route>

            {/* Faculty pages */}
            <Route
              element={<DashboardLayout requiredRole="faculty" />}
            >
              <Route
                path="/faculty/dashboard"
                element={<FacultyDashboard />}
              />

              <Route
                path="/faculty/attendance"
                element={<FacultyAttendance />}
              />

              <Route
                path="/faculty/internal1"
                element={<FacultyMarksEntry examNumber={1} />}
              />

              <Route
                path="/faculty/internal2"
                element={<FacultyMarksEntry examNumber={2} />}
              />

              <Route
                path="/faculty/profile"
                element={<ProfilePage />}
              />

              <Route
                path="/faculty/settings"
                element={<SettingsPage />}
              />
            </Route>

            {/* Unknown routes */}
            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
