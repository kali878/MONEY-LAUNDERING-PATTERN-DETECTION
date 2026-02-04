const Loader = ({ message = 'Loading System Data...', size = 'large' }) => {
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32',
    xlarge: 'w-40 h-40'
  };

  const centerSizes = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12', 
    large: 'w-16 h-16',
    xlarge: 'w-20 h-20'
  };

  const eyeSizes = {
    small: 'w-5 h-5',
    medium: 'w-7 h-7',
    large: 'w-10 h-10', 
    xlarge: 'w-12 h-12'
  };

  const pupilPositions = {
    small: 'mt-[5px]',
    medium: 'mt-[7px]',
    large: 'mt-[10px]',
    xlarge: 'mt-[12px]'
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm animate-fadeIn">
      <div className={`relative flex items-center justify-center ${sizeClasses[size]} animate-scaleIn`}>
        {/* Multiple rotating circles for enhanced effect */}
        <div className="absolute w-full h-full border-4 border-cyan-500/20 rounded-full animate-spin-slow"></div>
        <div className="absolute w-[90%] h-[90%] border-3 border-cyan-400/40 rounded-full animate-spin" 
             style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
        <div className="absolute w-[80%] h-[80%] border-2 border-cyan-300/60 rounded-full animate-spin"
             style={{ animationDuration: '1.5s' }}></div>
        
        {/* Main rotating arc */}
        <div
          className="absolute w-full h-full border-4 border-cyan-500 border-t-transparent border-r-transparent rounded-full animate-spin"
          style={{ animationDuration: '1.2s' }}
        ></div>

        {/* Enhanced pulsing center eye logo */}
        <div className={`absolute ${centerSizes[size]} flex items-center justify-center`}>
          <div className={`${eyeSizes[size]} bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full animate-glow shadow-lg`}>
            <div className={`w-1/2 h-1/2 bg-white rounded-full m-auto ${pupilPositions[size]} animate-bounce-subtle`}></div>
          </div>
        </div>

        {/* Orbiting dots */}
        <div className="absolute w-full h-full animate-spin" style={{ animationDuration: '3s' }}>
          <div className="absolute w-2 h-2 bg-cyan-400 rounded-full top-0 left-1/2 transform -translate-x-1/2 animate-pulse"></div>
        </div>
        <div className="absolute w-full h-full animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }}>
          <div className="absolute w-1.5 h-1.5 bg-cyan-300 rounded-full bottom-0 left-1/2 transform -translate-x-1/2 animate-pulse"></div>
        </div>
      </div>
      
      {/* Enhanced loading text with typing effect */}
      <div className="mt-8 text-center animate-fadeInUp">
        <p className="text-responsive-lg md:text-xl font-semibold text-cyan-300 tracking-widest animate-pulse-custom">
          {message}
        </p>
        <div className="flex justify-center mt-4 space-x-1">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 bg-cyan-400/30 rounded-full animate-bounce-subtle`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default Loader;

