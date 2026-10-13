// App.jsx

import React, { Suspense, lazy } from 'react';

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';

import AppLayout from './components/Layout/AppLayout';

import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import LandingPage from './components/LandingPage';

import Welcome from './components/Dashboard/Welcome';
import UserProfile from './components/Profile/UserProfile';

import ResumeUpload from './components/Interview/ResumeUpload';
import VoiceIntroduction from './components/Interview/VoiceIntroduction';
import InterviewQuestions from './components/Interview/InterviewQuestions';
import InterviewReport from './components/Interview/InterviewReport';

import Phase1Intro from './components/Phase1/Phase1Intro';
import Phase1Test from './components/Phase1/Phase1Test';
import Phase1Result from './components/Phase1/Phase1Result';

import Practice from './components/Practice/Practice';
import Interviews from './components/Interview/Interviews';

import UpcomingAssignment from './components/Coding/UpcomingAssignment';

import InterviewsManagement from './admin/components/InterviewsManagement';

import Quiz from './components/Quiz/Quiz';
import Quizstart from './components/Quiz/QuizStart';

import AssessmentInterview from './assessment/AssessmentInterview';

// ─── Assessment module ─────────────────────────────────────────────────

const AssessmentRoutes = lazy(
  () => import('./assessment/AssessmentRoutes')
);

import AssessmentEntry from './assessment/pages/AssessmentEntry';

import { useAuth } from './hooks/useAuth';

// ─── Admin panel ────────────────────────────────────────────────────────

import AdminRoute from './admin/auth/AdminRoute';
import AdminLogin from './admin/components/auth/AdminLogin';
import AdminLayout from './admin/layouts/AdminLayout';
import AdminDashboard from './admin/components/dashboard/AdminDashboard';

import QuizQuestionForm from './admin/components/quiz/QuizQuestionForm';
import PdfQuizManagement from './admin/components/pdf/PdfQuizManagement';
import CodingQuestionForm from './admin/components/coding/CodingQuestionForm';

import AssessmentCreate from './admin/components/assessment/AssessmentCreate';

import Analytics from './admin/components/analytics/Analytics';
import QuizAnalytics from './admin/components/analytics/QuizAnalytics';
import CodingAnalytics from './admin/components/analytics/CodingAnalytics';

import MasterData from './admin/pages/MasterData';

// ─── Protected Route Component ──────────────────────────────────────────

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicHome = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return isAuthenticated
    ? <AppLayout><Welcome /></AppLayout>
    : <LandingPage />;
};

// ─── Main App Component ─────────────────────────────────────────────────

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50 text-gray-900">

          <Routes>

            {/* ─── Public Routes ────────────────────────────────────── */}

            <Route
              path="/login"
              element={
                <>
                  <LandingPage />
                  <Login />
                </>
              }
            />

            <Route
              path="/"
              element={<PublicHome />}
            />

            <Route
              path="/register"
              element={
                <main className="container mx-auto px-4 py-8 max-w-6xl">
                  <Register />
                </main>
              }
            />

            {/* ─── Public Assessment Candidate Routes ──────────────── */}

            <Route
              path="/assessment/:token"
              element={
                <Suspense
                  fallback={
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                    </div>
                  }
                >
                  <AssessmentRoutes />
                </Suspense>
              }
            />

            <Route
              path="/exam/:token"
              element={
                <Suspense
                  fallback={
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                    </div>
                  }
                >
                  <AssessmentRoutes />
                </Suspense>
              }
            />

            {/* ─── Protected Routes ────────────────────────────────── */}

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >

              {/* Dashboard */}

              <Route
                path="/dashboard"
                element={<Welcome />}
              />

              {/* Profile */}

              <Route
                path="/profile"
                element={<UserProfile />}
              />

              {/* Practice */}

              <Route
                path="/practice"
                element={<Practice />}
              />

              {/* Quiz */}

              <Route
                path="/quiz"
                element={<Quiz />}
              />

              <Route
                path="/quiz/start"
                element={<Quizstart />}
              />

              {/* Assessment */}

              <Route
                path="/assessments"
                element={<AssessmentEntry />}
              />

              <Route
                path="/assessments/interview"
                element={<AssessmentInterview />}
              />

              {/* Interviews */}

              <Route
                path="/interviews"
                element={<Interviews />}
              />

              {/* Coding / Assignment */}

              <Route
                path="/upcoming-assignment"
                element={<UpcomingAssignment />}
              />

              {/* ─── Phase 1 Practice Flow ───────────────────────── */}

              <Route
                path="/phase1"
                element={<Phase1Intro />}
              />

              <Route
                path="/phase1/practice"
                element={<Phase1Test />}
              />

              <Route
                path="/phase1/results"
                element={<Phase1Result />}
              />

              {/* ─── Interview Flow ──────────────────────────────── */}

              {/* Step 1: Resume Upload */}

              <Route
                path="/upload-resume"
                element={<ResumeUpload />}
              />

              <Route
                path="/resume"
                element={<ResumeUpload />}
              />

              {/* Step 2: Voice Introduction */}

              <Route
                path="/intro"
                element={<VoiceIntroduction />}
              />

              {/* Step 3: Interview Questions */}

              <Route
                path="/interview"
                element={<InterviewQuestions />}
              />

              <Route
                path="/interview/questions"
                element={<InterviewQuestions />}
              />

              {/* Step 4: Interview Report */}

              <Route
                path="/report"
                element={<InterviewReport />}
              />

              <Route
                path="/interview/report"
                element={<InterviewReport />}
              />

            </Route>

            {/* ─── Existing Phase1 Direct Route ───────────────────── */}

            <Route
              path="/Phase1Test"
              element={<Phase1Test />}
            />

            {/* ─── Admin Master Data ──────────────────────────────── */}

            <Route
              path="/admin/master-data"
              element={<MasterData />}
            />

            {/* ─── Admin Panel ────────────────────────────────────── */}

            <Route
              path="/admin/login"
              element={<AdminLogin />}
            />

            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >

              <Route
                index
                element={
                  <Navigate
                    to="dashboard"
                    replace
                  />
                }
              />

              <Route
                path="dashboard"
                element={<AdminDashboard />}
              />

              <Route
                path="quiz"
                element={<QuizQuestionForm />}
              />

              <Route
                path="resume"
                element={<PdfQuizManagement />}
              />

              <Route
                path="interviews"
                element={<InterviewsManagement />}
              />

              <Route
                path="coding"
                element={<CodingQuestionForm />}
              />

              <Route
                path="assessment"
                element={<AssessmentCreate />}
              />

              <Route
                path="analytics"
                element={<Analytics />}
              />

              <Route
                path="analytics/quiz"
                element={<QuizAnalytics />}
              />

              <Route
                path="analytics/coding"
                element={<CodingAnalytics />}
              />

            </Route>

            {/* ─── Fallback Route ────────────────────────────────── */}

            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />

          </Routes>

        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;