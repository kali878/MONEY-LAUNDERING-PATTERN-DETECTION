import { Loader2 } from 'lucide-react'; // Using a specific loader icon

const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary', // 'primary', 'secondary', 'danger', 'ghost', 'outline'
  size = 'medium', // 'small', 'medium', 'large'
  disabled = false,
  isLoading = false,
  icon: Icon, // Pass icon component as a prop, e.g., icon={Plus}
  className = '',
  fullWidth = false,
  ...props
}) => {

  const baseStyles = `
    relative flex items-center justify-center font-semibold rounded-lg 
    transition-all duration-300 ease-in-out overflow-hidden group
    focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50
    transform hover:scale-105 active:scale-95
    ${fullWidth ? 'w-full' : ''}
  `;

  const sizeStyles = {
    small: 'h-8 px-3 text-sm',
    medium: 'h-10 px-4 text-base md:h-12 md:px-6',
    large: 'h-12 px-6 text-lg md:h-14 md:px-8'
  };

  const variantStyles = {
    primary: `
      bg-gradient-to-r from-cyan-600 to-cyan-500 text-white border border-cyan-500/50
      hover:from-cyan-500 hover:to-cyan-400 hover:shadow-cyan-500/40 hover:shadow-lg
      focus:ring-cyan-500/50 hover-glow
      disabled:from-cyan-800/50 disabled:to-cyan-700/50
    `,
    secondary: `
      bg-gradient-to-r from-gray-700 to-gray-600 text-gray-200 border border-gray-600/80
      hover:from-gray-600 hover:to-gray-500 hover:shadow-gray-600/30 hover:shadow-md
      focus:ring-gray-500/50
      disabled:from-gray-800/50 disabled:to-gray-700/50
    `,
    danger: `
      bg-gradient-to-r from-red-600 to-red-500 text-white border border-red-500/50
      hover:from-red-500 hover:to-red-400 hover:shadow-red-500/40 hover:shadow-lg
      focus:ring-red-500/50 hover-glow
      disabled:from-red-800/50 disabled:to-red-700/50
    `,
    ghost: `
      bg-transparent text-gray-300 border border-gray-600/50
      hover:bg-gray-700/30 hover:text-white hover:border-gray-500
      focus:ring-gray-500/50
      disabled:text-gray-500
    `,
    outline: `
      bg-transparent text-cyan-400 border-2 border-cyan-500/50
      hover:bg-cyan-500/10 hover:border-cyan-400 hover:text-cyan-300
      focus:ring-cyan-500/50
      disabled:text-cyan-600 disabled:border-cyan-800/50
    `
  };

  // Enhanced ripple effect
  const handleClick = (e) => {
    if (disabled || isLoading) return;
    
    // Create ripple effect
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 600ms linear;
      pointer-events: none;
    `;
    
    button.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
    
    if (onClick) onClick(e);
  };

  // Shimmer effect for primary variant
  const shimmerEffect = variant === 'primary' && !disabled && (
    <span 
      className="absolute inset-0 -top-[1px] -bottom-[1px] opacity-0 group-hover:opacity-100 
                 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                 translate-x-[-200%] group-hover:translate-x-[200%] 
                 transition-all duration-1000 ease-out"
    />
  );

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {shimmerEffect}
      
      <span className="relative z-10 flex items-center justify-center">
        {isLoading ? (
          <>
            <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 md:h-5 md:w-5" />
            <span className="text-responsive-sm">Processing...</span>
          </>
        ) : (
          <>
            {Icon && <Icon className="mr-2 -ml-1 h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:scale-110" />}
            <span className="text-responsive-sm">{children}</span>
          </>
        )}
      </span>

      {/* Loading dots animation */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      )}
    </button>
  );
};

// Add ripple animation to global styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

export default Button;
