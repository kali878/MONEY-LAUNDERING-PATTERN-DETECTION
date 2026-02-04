import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/firebaseConfig.js';
import { signOut } from 'firebase/auth';
import { LogOut, AlertTriangle, Check, X } from 'lucide-react';

const LogoutButton = ({ showText = true, variant = 'default' }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleLogout = async () => {
    if (variant === 'safe' && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsLoading(true);
    setShowConfirm(false);

    try {
      await signOut(auth);
      setShowSuccess(true);
      
      // Small delay to show success state
      setTimeout(() => {
        navigate('/login');
      }, 800);
    } catch (error) {
      console.error("Error signing out: ", error);
      setIsLoading(false);
      // Could add error toast here
    }
  };

  const cancelLogout = () => {
    setShowConfirm(false);
  };

  // Success state
  if (showSuccess) {
    return (
      <button
        disabled
        className="flex items-center space-x-2 text-green-400 transition-all duration-300 animate-pulse"
        title="Logged out successfully"
      >
        <Check className="h-5 w-5 animate-bounce" />
        {showText && <span className="hidden md:inline">Logged Out</span>}
      </button>
    );
  }

  // Confirmation state
  if (showConfirm) {
    return (
      <div className="flex items-center space-x-2 animate-fadeIn">
        <button
          onClick={handleLogout}
          disabled={isLoading}
          className="flex items-center space-x-1 px-2 py-1 text-red-400 hover:text-red-300 
                     bg-red-900/20 hover:bg-red-900/30 rounded-lg transition-all duration-200
                     border border-red-500/30 hover:border-red-500/50"
          title="Confirm logout"
        >
          <AlertTriangle className="h-4 w-4" />
          <span className="text-xs">Confirm</span>
        </button>
        <button
          onClick={cancelLogout}
          className="flex items-center space-x-1 px-2 py-1 text-gray-400 hover:text-gray-300 
                     bg-gray-900/20 hover:bg-gray-900/30 rounded-lg transition-all duration-200
                     border border-gray-500/30 hover:border-gray-500/50"
          title="Cancel logout"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Default state
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return `text-red-400 hover:text-red-300 hover:bg-red-900/10 
                border-red-500/20 hover:border-red-500/40`;
      case 'minimal':
        return `text-gray-500 hover:text-gray-300 hover:bg-transparent`;
      case 'safe':
        return `text-orange-400 hover:text-orange-300 hover:bg-orange-900/10 
                border-orange-500/20 hover:border-orange-500/40`;
      default:
        return `text-gray-400 hover:text-white hover:bg-gray-800/50 
                border-gray-600/20 hover:border-gray-600/40`;
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`
        flex items-center space-x-2 transition-all duration-300 
        transform hover:scale-105 active:scale-95
        px-3 py-2 rounded-lg border backdrop-blur-sm
        ${getVariantStyles()}
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        group relative overflow-hidden
      `}
      title={variant === 'safe' ? 'Click to confirm logout' : 'Logout'}
    >
      {/* Background hover effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
                      transform -skew-x-12 -translate-x-full group-hover:translate-x-full 
                      transition-transform duration-1000"></div>
      
      {/* Icon with loading state */}
      <div className="relative z-10">
        {isLoading ? (
          <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <LogOut className={`h-5 w-5 transition-transform duration-200 
                             ${isLoading ? '' : 'group-hover:rotate-12'}`} />
        )}
      </div>

      {/* Text with enhanced styling */}
      {showText && (
        <span className="hidden md:inline relative z-10 font-medium tracking-wide">
          {isLoading ? 'Signing out...' : 'Logout'}
        </span>
      )}

      {/* Pulse effect for safe variant */}
      {variant === 'safe' && (
        <div className="absolute inset-0 rounded-lg border-2 border-orange-500/30 
                        animate-ping opacity-20"></div>
      )}
    </button>
  );
};

export default LogoutButton;
    
