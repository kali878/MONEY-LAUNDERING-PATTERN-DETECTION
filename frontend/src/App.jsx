import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';

// Page Components
import LoginPage from './pages/LoginPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Triage from './pages/Triage.jsx';
import InvestigationWorkspace from './pages/InvestigationWorkspace.jsx';
import Reporting from './pages/Reporting.jsx';
import SettingsPage from './pages/SettingsPage.jsx'; // <-- 1. IMPORT THE NEW SETTINGS PAGE
import NotFound from './pages/NotFound.jsx';
import Loader from './components/common/Loader.jsx';

// This component will handle route protection
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    // Show a loader while Firebase is checking the auth state
    return <Loader />;
  }

  if (!user) {
    // If auth check is complete and there's no user, redirect to login
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated, render the requested component
  return children;
};

// This is the main application layout
function AppLayout() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes */}
      <Route 
        path="/dashboard" 
        element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
      />
      <Route 
        path="/triage/:personId" 
        element={<ProtectedRoute><Triage /></ProtectedRoute>} 
      />
      <Route 
        path="/workspace/:caseId" 
        element={<ProtectedRoute><InvestigationWorkspace /></ProtectedRoute>} 
      />
      <Route 
        path="/reporting" 
        element={<ProtectedRoute><Reporting /></ProtectedRoute>} 
      />

      {/* --- 2. ADD THE NEW ROUTE FOR THE SETTINGS PAGE --- */}
      <Route 
        path="/settings" 
        element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} 
      />

      {/* Redirect root to dashboard */}
      <Route 
        path="/" 
        element={<Navigate to="/dashboard" replace />} 
      />

      {/* 404 Not Found Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// This is the main App component that wraps everything in the AuthProvider
function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}

export default App;

