import { UserCircle, Menu, X, Settings, LayoutDashboard, FileText, Search } from "lucide-react";
import { useState, useEffect } from "react";
import LogoutButton from "./LogoutButton.jsx";
// Notifications removed
import { getProfile } from "../../services/api.js";
import { useAuth } from "../../hooks/useAuth.jsx";
import { useNavigate } from "react-router-dom";

// Enhanced logo with animation
const MiniAnupSecurityPortalLogo = () => (
  <div className="flex items-center group cursor-pointer">
    <div className="relative">
      <svg
        width="40"
        height="40"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-300 group-hover:scale-110"
      >
        <path
          d="M100 50C150 50 180 100 100 100C20 100 50 50 100 50Z"
          stroke="#00AEEF"
          strokeWidth="12"
          className="animate-pulse-custom"
        />
        <circle 
          cx="100" 
          cy="100" 
          r="30" 
          fill="#00AEEF" 
          className="group-hover:animate-glow"
        />
        <circle cx="100" cy="100" r="15" fill="#FFFFFF" />
        <path
          d="M100 150C50 150 20 100 100 100C180 100 150 150 100 150Z"
          stroke="#00AEEF"
          strokeWidth="12"
          className="animate-pulse-custom"
          style={{ animationDelay: '0.5s' }}
        />
      </svg>
      
      {/* Glowing ring effect */}
      <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping opacity-0 group-hover:opacity-100"></div>
    </div>
    
    <div className="ml-3 hidden sm:block">
      <h1 className="text-responsive-lg md:text-2xl font-bold text-gray-200 tracking-wider 
                     bg-gradient-to-r from-cyan-400 to-cyan-600 bg-clip-text text-transparent
                     group-hover:from-cyan-300 group-hover:to-cyan-500 transition-all duration-300">
        ANUP-SECURITY-PORTAL
      </h1>
      <div className="h-0.5 bg-gradient-to-r from-cyan-400 to-transparent 
                      transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
    </div>
  </div>
);

// Mobile menu component
const MobileMenu = ({ isOpen, onClose, navigate, profile }) => (
  <div className={`fixed inset-0 z-50 transition-all duration-300 md:hidden ${
    isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
  }`}>
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
  <div className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-gray-900 border-l border-cyan-500/30
           transform transition-transform duration-300 flex flex-col ${
                       isOpen ? 'translate-x-0' : 'translate-x-full'
                     }`}>
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-cyan-400">Menu</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>
      </div>
      
  <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* User Profile */}
        <div className="flex items-center space-x-3 p-4 bg-gray-800/50 rounded-lg">
          <UserCircle size={48} className="text-cyan-400" />
          <div>
            <p className="font-semibold text-gray-200">{profile?.email}</p>
            <p className="text-sm text-gray-400">{profile?.department || 'Investigator'}</p>
          </div>
        </div>
        
        {/* Menu Items (match desktop sidebar) */}
        <nav className="space-y-2">
          <button
            onClick={() => { navigate('/dashboard'); onClose(); }}
            className="w-full flex items-center space-x-3 p-3 text-gray-300 hover:text-cyan-400 hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => { navigate('/workspace/case-placeholder'); onClose(); }}
            className="w-full flex items-center space-x-3 p-3 text-gray-300 hover:text-cyan-400 hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <Search size={20} />
            <span>Investigation</span>
          </button>

          <button
            onClick={() => { navigate('/reporting'); onClose(); }}
            className="w-full flex items-center space-x-3 p-3 text-gray-300 hover:text-cyan-400 hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <FileText size={20} />
            <span>Reporting</span>
          </button>

          <button 
            onClick={() => { navigate('/settings'); onClose(); }}
            className="w-full flex items-center space-x-3 p-3 text-gray-300 hover:text-cyan-400 hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </nav>
        
        {/* Logout Button */}
        <div className="pt-6 border-t border-gray-700 flex justify-center">
          <LogoutButton 
            variant="danger"
            showText={true}
          />
        </div>
      </div>
    </div>
  </div>
);

const Header = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('anupsecurityportal-profile')||'null') || null; } catch (e) { return null; }
  });
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch persisted profile from backend to display displayName instead of raw email
  useEffect(() => {
    let aborted = false;
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const data = await getProfile();
        if (!aborted) {
          setProfile(data);
          try { localStorage.setItem('anupsecurityportal-profile', JSON.stringify(data)); } catch (e) { /* ignore storage errors */ }
        }
      } catch (e) {
        // non-fatal
        if (import.meta.env?.DEV) console.warn('Profile fetch failed', e);
      }
    };
    fetchProfile();
    return () => { aborted = true; };
  }, [user]);

  const handleLogoClick = () => {
    navigate('/dashboard');
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-16 md:h-20 px-4 md:px-8 
                         flex items-center justify-between 
                         glass-dark shadow-lg border-b border-cyan-500/20
                         animate-slideInDown">
        
        {/* Logo Section */}
        <div onClick={handleLogoClick} className="flex items-center space-x-4">
          <MiniAnupSecurityPortalLogo />
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
          {/* Notifications removed */}

          {/* Settings */}
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 text-gray-400 hover:text-cyan-400 
                       transition-all duration-300 hover:scale-110
                       rounded-lg hover:bg-gray-800/30"
            aria-label="Open settings"
          >
            <Settings size={24} />
          </button>

          {/* User Profile */}
          <div className="flex items-center space-x-3 border-l border-gray-700 pl-4 lg:pl-6">
            <div className="relative">
              <UserCircle size={40} className="text-cyan-400 hover:text-cyan-300 transition-colors" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900
                              animate-pulse-custom"></div>
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-sm font-semibold text-gray-200 text-responsive-sm" title={user?.email}>
                {profile?.displayName || user?.displayName || user?.email}
              </p>
              <p className="text-xs text-gray-400">{profile?.department || 'Investigator'}</p>
            </div>
          </div>

          {/* Logout Button */}
          <LogoutButton 
            variant="safe"
            showText={true}
          />
        </div>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden p-2 text-gray-400 hover:text-cyan-400 
                     transition-all duration-300 hover:scale-110
                     rounded-lg hover:bg-gray-800/30"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Mobile Menu */}
  <MobileMenu 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        profile={profile}
        navigate={navigate}
      />
    </>
  );
};

export default Header;
