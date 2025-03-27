import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { redirectAfterLogin } from '../utils/authUtils';

// Common components
import PrivateRoute from '../components/common/PrivateRoute';

// Auth components
import HomePage from '../components/auth/HomePage';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import ForgotPassword from '../components/auth/ForgotPassword';
import ResetPassword from '../components/auth/ResetPassword';

// CV components
import CVUpload from '../components/cv/CVUpload';
import CVSearch from '../components/cv/CVSearch';

// Channel components
import ChannelsListContainer from '../components/channel/ChannelsListContainer';

// Quiz components
import QuizManager from '../components/quiz/QuizManager';
import QuizGenerator from '../components/quiz/QuizGenerator';
import QuizViewerContainer from '../components/quiz/QuizViewerContainer';
import CandidateQuiz from '../components/quiz/CandidateQuiz';
import QuizResult from '../components/quiz/QuizResult';

const candidateId = localStorage.getItem('userId') || 'default-candidate';

const AppRoutes: React.FC = () => {
  const { 
    isAuthenticated, 
    userType, 
    setIsAuthenticated, 
    setUserName, 
    setUserType 
  } = useAuth();

  return (
    <Routes>
      <Route path="/home" element={<HomePage />} />
      <Route path="/" element={
        <PrivateRoute>
          <div className="mt-6">
            <CVUpload />
          </div>
        </PrivateRoute>
      } />
      <Route path="/search" element={
        <PrivateRoute>
          <div className="mt-6">
            <CVSearch />
          </div>
        </PrivateRoute>
      } />
      {/* Ajoutez la nouvelle route pour Channels */}
      <Route path="/channels" element={
        <PrivateRoute>
          <div className="mt-6">
            <ChannelsListContainer />
          </div>
        </PrivateRoute>
      } />
      
      {/* Routes pour les Quiz */}
      <Route path="/quiz" element={
        <PrivateRoute>
          <div className="mt-6">
            <QuizManager />
          </div>
        </PrivateRoute>
      } />
      <Route path="/quiz/generate" element={
        <PrivateRoute>
          <div className="mt-6">
            <QuizGenerator onQuizGenerated={(quiz) => console.log("Quiz generated:", quiz)} />
          </div>
        </PrivateRoute>
      } />
      <Route path="/quiz/view/:quizId" element={
        <PrivateRoute>
          <QuizViewerContainer />
        </PrivateRoute>
      } />
      <Route path="/quiz/:quizId/candidate" element={
        <CandidateQuiz candidateId={candidateId} />
      } />
      <Route path="/results/:submissionId" element={<QuizResult onReturnHome={() => window.location.href = '/'} />} />
      
      <Route path="/login" element={
        isAuthenticated ? 
          <Navigate to={redirectAfterLogin(userType)} /> : 
          <LoginForm 
            setIsAuthenticated={setIsAuthenticated} 
            setUserName={setUserName}
            setUserType={setUserType}
          />
      } />
      <Route path="/register" element={
          isAuthenticated ? 
            <Navigate to={redirectAfterLogin(userType)} /> : 
            <RegisterForm 
              setIsAuthenticated={setIsAuthenticated}
              setUserType={setUserType} 
            />
        } />
      <Route path="/forgot-password" element={
        isAuthenticated ? 
          <Navigate to="/" /> : 
          <ForgotPassword />
      } />
      <Route path="/reset-password/:token" element={
        isAuthenticated ? 
          <Navigate to="/" /> : 
          <ResetPassword />
      } />
      {/* Route pour rediriger les anciens liens vers la page d'upload */}
      <Route path="/results" element={<Navigate to="/" replace />} />
      <Route path="*" element={
        <Navigate to={isAuthenticated ? "/" : "/home"} replace />
      } />
    </Routes>
  );
};

export default AppRoutes;