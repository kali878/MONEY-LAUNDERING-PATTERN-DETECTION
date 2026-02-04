import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import { ShieldAlert, Home } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white text-center p-4">
      <div 
        className="relative w-full max-w-md bg-gray-900/60 backdrop-blur-md border border-cyan-500/20 rounded-lg shadow-2xl shadow-cyan-900/30 p-10"
      >
        <div className="mb-4">
          <ShieldAlert className="h-20 w-20 text-red-500 mx-auto animate-pulse" />
        </div>
        <h1 className="text-6xl font-bold text-red-500 mb-2">404</h1>
        <h2 className="text-3xl font-semibold text-gray-100 mb-4">Page Not Found</h2>
        <p className="text-gray-400 mb-8">
          The page you are looking for does not exist or has been moved. 
          Please check the URL or return to the dashboard.
        </p>
        <Link to="/dashboard">
          <Button variant="primary" icon={Home}>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
