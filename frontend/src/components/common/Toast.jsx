import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const Toast = ({ toast, onClose }) => {
  const { id, type, title, message, duration = 5000, action } = toast;
  
  const typeStyles = {
    success: {
      icon: CheckCircle,
      colors: 'bg-green-500/20 border-green-500/50 text-green-300',
      iconColor: 'text-green-400'
    },
    error: {
      icon: AlertCircle,
      colors: 'bg-red-500/20 border-red-500/50 text-red-300',
      iconColor: 'text-red-400'
    },
    warning: {
      icon: AlertTriangle,
      colors: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
      iconColor: 'text-yellow-400'
    },
    info: {
      icon: Info,
      colors: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
      iconColor: 'text-blue-400'
    }
  };

  const { icon: Icon, colors, iconColor } = typeStyles[type] || typeStyles.info;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  return (
    <div className={`relative p-4 rounded-lg border ${colors} backdrop-blur-md 
                     animate-slideInUp hover-lift shadow-lg max-w-sm w-full group`}>
      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 rounded-b-lg
                       animate-[shrink_5s_linear_forwards]"
             style={{
               animation: `shrink ${duration}ms linear forwards`
             }} />
      )}
      
      <div className="flex items-start space-x-3">
        <Icon size={20} className={`${iconColor} flex-shrink-0 mt-0.5 
                                   transition-transform duration-300 group-hover:scale-110`} />
        
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="font-semibold text-sm mb-1 text-responsive-sm">
              {title}
            </h4>
          )}
          <p className="text-sm opacity-90 text-responsive-xs">
            {message}
          </p>
          {action && (
            <div className="mt-3">
              {action}
            </div>
          )}
        </div>
        
        <button
          onClick={() => onClose(id)}
          className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 
                     transition-colors duration-200 opacity-70 hover:opacity-100"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

const ToastContainer = ({ toasts, onClose }) => {
  if (!toasts.length) return null;

  return (
    <div className="fixed top-20 right-4 z-60 space-y-3 pointer-events-none">
      <div className="flex flex-col space-y-3 pointer-events-auto">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <Toast toast={toast} onClose={onClose} />
          </div>
        ))}
      </div>
    </div>
  );
};

// Toast Hook
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toast, id }]);
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  // Convenience methods
  const toast = {
    success: (message, options = {}) => 
      addToast({ type: 'success', message, ...options }),
    
    error: (message, options = {}) => 
      addToast({ type: 'error', message, ...options }),
    
    warning: (message, options = {}) => 
      addToast({ type: 'warning', message, ...options }),
    
    info: (message, options = {}) => 
      addToast({ type: 'info', message, ...options }),
    
    custom: (toast) => addToast(toast)
  };

  return {
    toasts,
    toast,
    removeToast,
    clearAllToasts,
    ToastContainer: () => <ToastContainer toasts={toasts} onClose={removeToast} />
  };
};

// Add the shrink animation to global styles
if (typeof document !== 'undefined' && !document.querySelector('#toast-animations')) {
  const style = document.createElement('style');
  style.id = 'toast-animations';
  style.textContent = `
    @keyframes shrink {
      from { width: 100%; }
      to { width: 0%; }
    }
  `;
  document.head.appendChild(style);
}

export default ToastContainer;
