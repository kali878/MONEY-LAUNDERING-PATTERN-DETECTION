import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth"; // <-- 1. Import the useAuth hook
import { Eye, EyeOff, LogIn, Shield, User, Key } from "lucide-react";

// Enhanced SVG Logo Component for ANUP-SECURITY-PORTAL
const AnupSecurityPortalLogo = () => (
  <div className="flex flex-col items-center justify-center mb-8">
    <div className="relative">
      <svg
        width="120"
        height="120"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-2xl"
      >
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00AEEF" />
            <stop offset="100%" stopColor="#9EFF00" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M100 50C150 50 180 100 100 100C20 100 50 50 100 50Z"
          stroke="url(#logoGradient)"
          strokeWidth="8"
          filter="url(#glow)"
        />
        <circle
          cx="100"
          cy="100"
          r="30"
          fill="url(#logoGradient)"
          filter="url(#glow)"
        />
        <circle cx="100" cy="100" r="15" fill="#FFFFFF" />
        <path
          d="M100 150C50 150 20 100 100 100C180 100 150 150 100 150Z"
          stroke="url(#logoGradient)"
          strokeWidth="8"
          filter="url(#glow)"
        />
        <style>{`
                    @keyframes logoFloat {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(-5px); }
                    }
                    svg { animation: logoFloat 3s ease-in-out infinite; }
                `}</style>
      </svg>
      <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-xl animate-pulse"></div>
    </div>
    <h1 className="text-6xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text mt-4 tracking-wider">
     ANUP-SECURITY-PORTAL
    </h1>
    <p className="text-gray-400 text-sm mt-2 font-mono">
      Neural Eye for Threat Recognition & Analysis
    </p>
  </div>
);

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // --- 2. Get the login function and navigation hook ---
  const { login, user, logout } = useAuth();
  const navigate = useNavigate();

  // If user is already logged in, show logout option
  if (user) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-300 font-sans">
        <div className="w-full max-w-lg p-10 space-y-8 rounded-3xl shadow-2xl bg-gray-800/80 backdrop-blur-xl border border-cyan-500/30 relative overflow-hidden">
          <div className="text-center">
            <h2 className="text-2xl font-light text-gray-200 mb-4">
              Already Logged In
            </h2>
            <p className="text-cyan-400 text-sm mb-6">User: {user.email}</p>
            <button
              onClick={() => {
                sessionStorage.clear();
                logout();
              }}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Logout & Test Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 3. Update the handleLogin function ---
  const handleLogin = async () => {
    console.log("=== BUTTON CLICKED ===");
    console.log("Email:", email, "Password:", password);

    setError(""); // Clear any existing error
    setIsLoading(true);

    try {
      // Use the useAuth hook for authentication
      await login(email, password);
      console.log("Login successful - storing auth token and navigating to dashboard");
      
      // Store the mock token for API authentication
      localStorage.setItem('authToken', 'mock-jwt-token-12345');
      
      setIsLoading(false);
      // Navigate to dashboard
      navigate("/dashboard");
    } catch (err) {
      console.log("Login failed - setting error");
      setError("Authentication failed. Please check your credentials.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen text-gray-300 font-sans">
      <div className="w-full max-w-lg p-10 space-y-8 rounded-3xl shadow-2xl bg-gray-800/80 backdrop-blur-xl border border-cyan-500/30 relative overflow-hidden">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 rounded-3xl"></div>

        <div className="relative z-10">
          <AnupSecurityPortalLogo />

          <div className="text-center space-y-2 mb-8">
            <h2 className="text-3xl font-light text-gray-200">
              Secure Access Portal
            </h2>
            <p className="text-cyan-400 text-sm">
              Financial Crimes Investigation System
            </p>
          </div>

          <div className="space-y-6">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400 group-focus-within:text-cyan-400 transition-colors" />
              </div>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="peer w-full h-14 pl-12 pr-4 text-lg text-gray-100 bg-gray-900/70 border-2 border-gray-600 rounded-xl placeholder-transparent focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 hover:border-gray-500"
                placeholder="Investigator ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label
                htmlFor="email-address"
                className="absolute left-12 -top-3 text-gray-400 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-4 peer-focus:-top-3 peer-focus:text-cyan-400 peer-focus:text-sm bg-gray-800 px-2 rounded"
              >
                Investigator ID
              </label>
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-gray-400 group-focus-within:text-cyan-400 transition-colors" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="peer w-full h-14 pl-12 pr-14 text-lg text-gray-100 bg-gray-900/70 border-2 border-gray-600 rounded-xl placeholder-transparent focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 hover:border-gray-500"
                placeholder="Secure Access Key"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label
                htmlFor="password"
                className="absolute left-12 -top-3 text-gray-400 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-4 peer-focus:-top-3 peer-focus:text-cyan-400 peer-focus:text-sm bg-gray-800 px-2 rounded"
              >
                Secure Access Key
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 hover:text-cyan-400 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error && (
              <div className="bg-red-500/90 border-2 border-red-400 text-white p-6 rounded-lg text-center animate-shake shadow-lg mb-4">
                <div className="flex items-center justify-center space-x-3">
                  <Shield className="h-6 w-6 text-red-100" />
                  <span className="font-bold text-lg">{error}</span>
                </div>
              </div>
            )}

            <div>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleLogin}
                className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-cyan-500/25"
              >
                <span className="absolute left-0 top-0 h-full w-0 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 group-hover:w-full rounded-xl"></span>
                <span className="relative flex items-center">
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-3" size={24} />
                      Secure Access
                    </>
                  )}
                </span>
              </button>
            </div>

            <div className="text-center space-y-2">
              <div className="text-xs text-gray-500">
                Protected by 256-bit encryption
              </div>
              <div className="text-xs text-gray-500">
                Session timeout: 8 hours
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
