'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Search, 
  ShieldAlert, 
  History, 
  UserCircle,
  X,
  Menu,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Logo } from './Logo';
import { useSidebar } from '@/context/SidebarContext';

const navItems = [
  { id: 'assessment', label: 'Assessment', icon: <BarChart3 />, path: '/dashboard' },
  { id: 'new-scan', label: 'New Scan', icon: <Search />, path: '/' },
  { id: 'malware-scan', label: 'Malware Scan', icon: <ShieldAlert />, path: '/dashboard/malware-scan' },
  { id: 'scan-history', label: 'Scan History', icon: <History />, path: '/dashboard/scan-history' },
  { id: 'malware-scan-history', label: 'Malware Scan History', icon: <History />, path: '/dashboard/malware-scan-history' },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [isLogoHovered, setIsLogoHovered] = React.useState(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (isCollapsed) {
      setIsLogoHovered(true);
      // Automatically open after 300ms of hovering
      hoverTimeoutRef.current = setTimeout(() => {
        setIsCollapsed(false);
        setIsLogoHovered(false);
      }, 300);
    }
  };

  const handleMouseLeave = () => {
    if (isCollapsed) {
      setIsLogoHovered(false);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    }
  };

  return (
    <aside 
      className={`${isCollapsed ? 'w-20' : 'w-64'} h-screen bg-[#0F172A] text-slate-300 flex flex-col fixed left-0 top-0 border-r border-slate-800/50 z-[100] transition-all duration-300 ease-in-out group`}
    >
      {/* Sidebar Header */}
      <div className={`p-6 flex items-center justify-between mb-8 overflow-hidden h-20`}>
        <div 
          className="relative flex items-center cursor-pointer"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => {
            if (isCollapsed) {
              setIsCollapsed(false);
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            }
          }}
        >
          {isCollapsed ? (
            <AnimatePresence mode="wait">
              {isLogoHovered ? (
                <motion.button
                  key="open-btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg"
                >
                  <ChevronRight size={18} />
                </motion.button>
              ) : (
                <motion.div
                  key="small-logo"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Logo className="w-8 h-8 brightness-0 invert opacity-90" showOnlyIcon={true} />
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <Logo className="w-auto h-7 brightness-0 invert opacity-90" />
          )}
        </div>

        {!isCollapsed && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
          </motion.button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.path || 
            (item.path === '/dashboard' && pathname === '/dashboard') ||
            (item.id === 'scan-history' && pathname === '/dashboard/report');
          
          return (
            <Link 
              key={item.id} 
              href={item.path}
              title={isCollapsed ? item.label : undefined}
              className={`group flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-xl transition-all duration-200 relative ${
                isActive 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className={`transition-colors duration-200 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
                {React.cloneElement(item.icon as React.ReactElement<any>, { size: 18 })}
              </div>
              {!isCollapsed && (
                <span className="text-sm font-medium tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Profile / Bottom Section */}
      <div className={`p-4 border-t border-slate-800/50 overflow-hidden`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} p-3 rounded-xl hover:bg-slate-800/50 transition-all cursor-pointer`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
            RJ
          </div>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-white truncate">Robert James</p>
              <p className="text-[10px] text-slate-500 truncate">Administrator</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
