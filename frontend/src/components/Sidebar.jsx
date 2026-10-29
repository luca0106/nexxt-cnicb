import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  Users,
  Folder,
  FileText,
  CheckSquare,
  X
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutGrid },
  { name: 'Clients', path: '/clients', icon: Users },
  { name: 'Cases', path: '/cases', icon: Folder },
  { name: 'Documents', path: '/documents', icon: FileText },
  { name: 'Tasks', path: '/tasks', icon: CheckSquare },
];

export default function Sidebar({ isMobileOpen, onCloseMobile, isCollapsed }) {
  const sidebarContent = (collapsedMode) => (
    <div className="flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4 px-3">
          {!collapsedMode && (
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              Menu
            </div>
          )}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
            aria-label="Close menu"
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
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#101b33]'
                  } ${collapsedMode ? 'justify-center px-0' : ''}`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsedMode && <span>{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {!collapsedMode && (
        <div className="pt-6 border-t border-[#142036]">
          <div className="p-3.5 rounded-xl bg-[#090f1e] border border-[#142036] text-xs text-slate-400">
            <span className="block font-medium text-slate-300">Retail Department</span>
            <span className="text-[11px] text-slate-400">Credit Operations & Triage</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Drawer */}
      <div
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseMobile}
      >
        <aside
          className={`w-64 h-full bg-[#050811] border-r border-[#142036] p-4 transition-transform duration-300 ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {sidebarContent(false)}
        </aside>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 bg-[#050811] border-r border-[#142036] p-4 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent(isCollapsed)}
      </aside>
    </>
  );
}
