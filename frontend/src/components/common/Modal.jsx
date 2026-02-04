import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footerContent, 
  size = 'medium', // 'small', 'medium', 'large', 'fullscreen'
  showCloseButton = true,
  closeOnBackdrop = true,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    fullscreen: 'max-w-[95vw] max-h-[95vh]'
  };

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = 'unset';
      }, 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsAnimating(false);
        setTimeout(() => {
          onClose();
        }, 150);
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 150);
  };

  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 
                  transition-all duration-300 ease-out
                  ${isAnimating ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0'}`}
      onClick={handleBackdropClick}
    >
      {/* Modal Container */}
      <div
        className={`relative w-full ${sizeClasses[size]} 
                    glass-dark shadow-2xl shadow-cyan-900/50 rounded-xl
                    transition-all duration-300 ease-out transform
                    ${isAnimating 
                      ? 'scale-100 opacity-100 translate-y-0' 
                      : 'scale-95 opacity-0 translate-y-4'
                    }
                    ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing border effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 
                        rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-1000"></div>
        
        <div className="relative bg-gray-900/90 backdrop-blur-xl border border-cyan-500/30 rounded-xl overflow-hidden">
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-700/50
                            bg-gradient-to-r from-gray-800/50 to-gray-900/50">
              {title && (
                <h3 className="text-lg md:text-xl font-bold text-cyan-300 tracking-wider
                               bg-gradient-to-r from-cyan-400 to-cyan-600 bg-clip-text text-transparent">
                  {title}
                </h3>
              )}
              
              {showCloseButton && (
                <button
                  onClick={handleClose}
                  className="text-gray-400 rounded-full p-2 hover:bg-gray-700/50 hover:text-white 
                             transition-all duration-200 hover:scale-110 focus:outline-none 
                             focus:ring-2 focus:ring-cyan-500 ml-auto"
                >
                  <X size={20} className="md:w-6 md:h-6" />
                </button>
              )}
            </div>
          )}

          {/* Body Content */}
          <div className={`p-4 md:p-6 text-gray-300 
                          ${size === 'fullscreen' ? 'max-h-[70vh]' : 'max-h-[60vh]'} 
                          overflow-y-auto custom-scrollbar`}>
            <div className="animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
              {children}
            </div>
          </div>

          {/* Footer */}
          {footerContent && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center 
                            justify-end p-4 md:p-6 border-t border-gray-700/50 
                            space-y-2 sm:space-y-0 sm:space-x-3
                            bg-gradient-to-r from-gray-900/50 to-gray-800/50
                            animate-fadeInUp"
                 style={{ animationDelay: '0.2s' }}>
              {footerContent}
            </div>
          )}
        </div>
      </div>

      {/* Loading overlay for async operations */}
      {isAnimating && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 
                          animate-pulse opacity-0 hover:opacity-100 transition-opacity duration-1000"></div>
        </div>
      )}
    </div>
  );
};

// Enhanced scrollbar styles
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(75, 85, 99, 0.3);
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(45deg, #0891b2, #06b6d4);
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(45deg, #06b6d4, #0891b2);
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.querySelector('#modal-scrollbar-styles')) {
  const style = document.createElement('style');
  style.id = 'modal-scrollbar-styles';
  style.textContent = scrollbarStyles;
  document.head.appendChild(style);
}

export default Modal;
