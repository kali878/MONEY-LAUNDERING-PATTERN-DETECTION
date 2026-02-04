import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.jsx"; // Import the real useAuth hook

// A themed loader component that matches our futuristic UI style
const AuthLoader = () => (
  <div
    className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-300 font-sans"
    style={{
      backgroundImage: `
          radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0),
          radial-gradient(circle at 25px 25px, rgba(255,255,255,0.05) 1px, transparent 0)
        `,
      backgroundSize: "50px 50px",
    }}
  >
    <div className="p-8 rounded-2xl bg-gray-800/60 backdrop-blur-xl border border-cyan-500/30">
      <svg
        width="80"
        height="80"
        viewBox="0 0 100 100"
        className="animate-spin"
        style={{ animationDuration: "3s" }}
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="#00AEEF"
          strokeWidth="5"
          fill="none"
          strokeDasharray="141.3"
          strokeDashoffset="70.6"
          strokeLinecap="round"
        />
        <circle
          cx="50"
          cy="50"
          r="35"
          stroke="#9EFF00"
          strokeWidth="4"
          fill="none"
          strokeDasharray="109.9"
          strokeDashoffset="27.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
    <p className="mt-4 text-xl text-cyan-400">
      Verifying Security Clearance...
    </p>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // If the authentication status is still being determined, show a loader.
  // This prevents a jarring flash of the login page for already-authenticated users on page refresh.
  if (loading) {
    return <AuthLoader />;
  }

  // If the user is not authenticated, redirect them to the login page.
  // We also pass the current location in the state, so after logging in,
  // they can be redirected back to the page they were trying to access.
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If the user is authenticated, render the child component (the protected page).
  return children;
};

export default ProtectedRoute;
