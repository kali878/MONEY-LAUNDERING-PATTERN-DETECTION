import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, ChevronsLeft, ChevronsRight, Search } from 'lucide-react';

const NavItem = ({ to, icon: Icon, text, isExpanded }) => {
  return (
    <NavLink
      to={to}
      title={text}
      className={({ isActive }) => `
        flex items-center h-12 text-gray-300 rounded-lg cursor-pointer
        transition-all duration-300 ease-in-out group relative
        ${isExpanded ? 'px-4' : 'justify-center'}
        ${isActive
          ? 'bg-cyan-600/50 text-white shadow-lg shadow-cyan-800/40'
          : 'hover:bg-gray-700/50'
        }
      `}
    >
      <Icon size={22} />
      <span
        className={`
          ml-4 font-semibold overflow-hidden whitespace-nowrap transition-all duration-300
          ${isExpanded ? 'w-40 opacity-100' : 'w-0 opacity-0'}
        `}
      >
        {text}
      </span>
      {!isExpanded && (
        <div className="absolute left-full rounded-md px-2 py-1 ml-6 bg-gray-800 text-cyan-300 text-sm invisible opacity-20 -translate-x-3 transition-all group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap z-50">
          {text}
        </div>
      )}
    </NavLink>
  );
};

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  const navItems = [
    { icon: LayoutDashboard, text: 'Dashboard', path: '/dashboard' },
    { icon: Search, text: 'Investigation', path: '/workspace/case-placeholder' },
    { icon: FileText, text: 'Reporting', path: '/reporting' },
    { icon: Settings, text: 'Settings', path: '/settings' },
  ];

  return (
    <aside
      className={`
        hidden md:flex h-full pt-24 pb-8 px-4 flex-col
        bg-gray-900/60 backdrop-blur-xl border-r border-cyan-500/20
        transition-all duration-300 ease-in-out
        ${isExpanded ? 'w-72' : 'w-24'}
      `}
    >
      <nav className="flex-1 space-y-4">
        {navItems.map((item) => (
          <NavItem key={item.text} to={item.path} icon={item.icon} text={item.text} isExpanded={isExpanded} />
        ))}
      </nav>

      <div className="border-t border-gray-700/50 pt-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center h-12 text-gray-400 rounded-lg hover:bg-gray-700/50 transition-colors"
          title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {isExpanded ? <ChevronsLeft size={22} /> : <ChevronsRight size={22} />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

