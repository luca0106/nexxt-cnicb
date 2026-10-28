import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  Users,
  Folder,
  FileText,
  CheckSquare,
  History,
  X
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutGrid },
  { name: 'Clienți', path: '/clienti', icon: Users },
  { name: 'Dosare', path: '/dosare', icon: Folder },
  { name: 'Documente', path: '/documente', icon: FileText },
  { name: 'Sarcini', path: '/sarcini', icon: CheckSquare },
  { name: 'Istoric', path: '/istoric', icon: History },
];

export default function Sidebar({ isMobileOpen, onCloseMobile, isCollapsed }) {
  const sidebarContent = (collapsedMode) => (
    <div className="flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4 px-3">
          {!collapsedMode && (
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              Meniu
            </div>
          )}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
            aria-label="Închide meniul"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onCloseMobile}
                title={collapsedMode ? item.name : undefined}
                className={({ isActive }) =>
                  `flex items-center ${
                    collapsedMode ? 'justify-center px-2.5' : 'gap-3.5 px-3'
                  } py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsedMode && <span className="truncate">{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {!collapsedMode && (
        <div className="pt-6 border-t border-[#121c2e] text-xs text-slate-500 px-3">
          <p className="font-semibold text-slate-400">Departament Retail</p>
          <p className="text-[11px] text-slate-600 mt-0.5">BankDesk v2.4 + Copilot</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[#050811] border-r border-[#121c2e] shrink-0 transition-all duration-200 sticky top-[65px] h-[calc(100vh-65px)] ${
          isCollapsed ? 'w-16 p-3' : 'w-60 p-5'
        }`}
      >
        {sidebarContent(isCollapsed)}
      </aside>

      {/* Mobile & Tablet Slide-Over Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 w-64 max-w-[80vw] bg-[#070c18] border-r border-[#182640] p-5 h-full shadow-2xl">
            {sidebarContent(false)}
          </aside>
        </div>
      )}
    </>
  );
}
