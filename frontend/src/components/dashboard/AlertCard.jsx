import { ShieldAlert, User, Clock, ArrowRight, AlertTriangle, Eye } from 'lucide-react';
import { useState } from 'react';
import Button from '../common/Button';

const AlertCard = ({ alert, index = 0 }) => {
  const { person_name, risk_score, summary, timestamp, person_id } = alert;
  const [isHovered, setIsHovered] = useState(false);

  const getRiskColor = (score) => {
    if (score > 85) return 'red';
    if (score > 60) return 'orange';
    return 'yellow';
  };

  const getRiskLevel = (score) => {
    if (score > 85) return 'CRITICAL';
    if (score > 60) return 'HIGH';
    return 'MEDIUM';
  };

  const riskColor = getRiskColor(risk_score);
  const riskLevel = getRiskLevel(risk_score);

  const riskStyles = {
    red: {
      gradient: 'from-red-500/20 via-red-600/30 to-red-800/20',
      text: 'text-red-300',
      border: 'border-red-500/50',
      shadow: 'shadow-red-500/30',
      glowRing: 'ring-red-500',
      badge: 'bg-red-500/20 border-red-500/50',
      icon: 'text-red-400',
    },
    orange: {
      gradient: 'from-orange-500/20 via-orange-600/30 to-orange-800/20',
      text: 'text-orange-300',
      border: 'border-orange-500/50',
      shadow: 'shadow-orange-500/30',
      glowRing: 'ring-orange-500',
      badge: 'bg-orange-500/20 border-orange-500/50',
      icon: 'text-orange-400',
    },
    yellow: {
      gradient: 'from-yellow-500/20 via-yellow-600/30 to-yellow-800/20',
      text: 'text-yellow-300',
      border: 'border-yellow-500/50',
      shadow: 'shadow-yellow-500/30',
      glowRing: 'ring-yellow-500',
      badge: 'bg-yellow-500/20 border-yellow-500/50',
      icon: 'text-yellow-400',
    },
  };

  const currentRiskStyle = riskStyles[riskColor];

  return (
    <div
      className="w-full animate-fadeInUp hover-lift"
      style={{ animationDelay: `${index * 0.1}s` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`
          relative overflow-hidden w-full glass-dark rounded-xl 
          border ${currentRiskStyle.border} p-6 flex flex-col justify-between 
          transition-all duration-500 ease-out group 
          hover:shadow-2xl hover:${currentRiskStyle.shadow} 
          hover:border-opacity-80 hover:scale-[1.02]
          ${isHovered ? 'animate-glow' : ''}
        `}
      >
        {/* Dynamic background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${currentRiskStyle.gradient} 
                        opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full 
                        bg-gradient-to-r from-transparent via-white/5 to-transparent 
                        transition-transform duration-1000 ease-out"></div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <User className={`${currentRiskStyle.icon} h-6 w-6 transition-transform duration-300 
                                group-hover:scale-110`} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg md:text-xl font-bold text-gray-100 truncate 
                               group-hover:text-white transition-colors duration-300">
                  {person_name}
                </h3>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold
                                border ${currentRiskStyle.badge} ${currentRiskStyle.text} mt-1
                                animate-pulse-custom`}>
                  <AlertTriangle size={12} className="mr-1" />
                  {riskLevel} RISK
                </div>
              </div>
            </div>
            
            {/* Risk Score Circle */}
            <div className="flex-shrink-0 ml-4">
              <div
                className={`relative flex items-center justify-center h-16 w-16 md:h-20 md:w-20 
                           rounded-full border-2 ${currentRiskStyle.border}
                           transition-all duration-300 group-hover:scale-110
                           ${isHovered ? 'animate-glow' : ''}`}
                style={{
                  background: `conic-gradient(${riskColor === 'red' ? '#ef4444' : 
                                              riskColor === 'orange' ? '#f97316' : '#eab308'} ${risk_score * 3.6}deg, 
                                              rgba(75, 85, 99, 0.3) 0deg)`
                }}
              >
                <div className="absolute inset-1 bg-gray-900 rounded-full flex items-center justify-center">
                  <span className={`text-xl md:text-2xl font-bold ${currentRiskStyle.text}
                                   transition-all duration-300 group-hover:scale-110`}>
                    {risk_score}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="mb-6">
            <div className="relative p-4 bg-gray-800/30 rounded-lg border border-gray-700/50
                           group-hover:bg-gray-800/50 transition-colors duration-300">
              <div className="absolute top-2 left-2">
                <Eye size={14} className="text-cyan-400 opacity-70" />
              </div>
              <p className="text-gray-300 text-sm md:text-base leading-relaxed pl-6
                           group-hover:text-gray-200 transition-colors duration-300">
                &ldquo;{summary}&rdquo;
              </p>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center 
                          pt-4 border-t border-gray-700/50 space-y-3 sm:space-y-0">
            <div className="flex items-center text-sm text-gray-400 group-hover:text-gray-300
                           transition-colors duration-300">
              <Clock size={16} className="mr-2 animate-spin-slow" />
              <span className="text-responsive-xs">
                {new Date(timestamp).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
           
            <div className="flex space-x-2">
              <a href={`/triage/${person_id}`} className="flex-1 sm:flex-none">
                <Button 
                  variant="primary" 
                  size="small"
                  className="w-full sm:w-auto hover-lift transition-all duration-300
                           group-hover:shadow-cyan-500/50"
                >
                  <span className="text-responsive-xs">Investigate</span>
                  <ArrowRight size={16} className="ml-2 transition-transform duration-300 
                                                 group-hover:translate-x-1" />
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Floating alert indicator */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 
                       transition-opacity duration-300">
          <ShieldAlert size={20} className={`${currentRiskStyle.icon} animate-bounce-subtle`} />
        </div>
      </div>
    </div>
  );
};

export default AlertCard;

