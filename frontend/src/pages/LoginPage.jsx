import React from "react";
import LoginForm from "../components/auth/LoginForm.jsx";

const LoginPage = () => {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Enhanced animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-cyan-500/20 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-500/15 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-purple-500/10 rounded-full filter blur-2xl animate-pulse delay-2000"></div>
      </div>

      {/* Enhanced grid pattern overlay */}
      <div
        className="absolute top-0 left-0 w-full h-full z-10 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,174,239,0.1) 1px, transparent 1px), 
            linear-gradient(90deg, rgba(0,174,239,0.1) 1px, transparent 1px),
            radial-gradient(circle at 25% 25%, rgba(0,174,239,0.05) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(158,255,0,0.05) 0%, transparent 50%)
          `,
          backgroundSize: "3rem 3rem, 3rem 3rem, 100% 100%, 100% 100%",
        }}
      ></div>

      {/* Floating particles */}
      <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          ></div>
        ))}
      </div>

      {/* Header text */}
      <div className="absolute top-8 left-8 z-20 text-gray-400">
        <div className="text-sm font-mono">
          ANUP-SECURITY-PORTAL Financial Crimes Investigation System
        </div>
        <div className="text-xs opacity-60">Secure Access Portal</div>
      </div>

      {/* Footer text */}
      <div className="absolute bottom-8 left-8 right-8 z-20 text-center text-gray-500 text-xs">
        <div>Protected by advanced encryption | Authorized personnel only</div>
        <div className="mt-1">© 2025 ANUP-SECURITY-PORTAL. All rights reserved.</div>
      </div>

      <div className="relative z-20">
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;
