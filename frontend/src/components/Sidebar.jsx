import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Users, Folder, FileText, CheckSquare, History, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Avatar } from './ui';

const NAV = [
  { name: 'Overview', path: '/', icon: LayoutGrid },
  { name: 'Cases', path: '/cases', icon: Folder },
  { name: 'Clients', path: '/clients', icon: Users },
  { name: 'Documents', path: '/documents', icon: FileText },
  { name: 'Tasks', path: '/tasks', icon: CheckSquare },
  { name: 'Audit log', path: '/history', icon: History },
];

export function BrandMark() {
  return (
    <span className="w-7 h-7 rounded-md bg-accent flex items-center justify-center shrink-0" aria-hidden>
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#121212" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 18h14M7 10.5h10M8.5 10.5v5M12 10.5v5M15.5 10.5v5M5.5 9.5 12 5.5l6.5 4" />
      </svg>
    </span>
  );
}

function SidebarContent({ collapsed, onNavigate, onToggleCollapse, onClose }) {
  return (
    <div className="flex flex-col h-full">
      <div className={`flex items-center h-14 px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandMark />
          {!collapsed && <span className="text-[15px] font-semibold text-fg">BankDesk</span>}
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close menu" className="w-8 h-8 inline-flex items-center justify-center rounded-md text-fg-muted hover:bg-raised">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav aria-label="Main" className="flex-1 px-2 py-2 space-y-0.5">
        {NAV.map(({ name, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            onClick={onNavigate}
            title={collapsed ? name : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 h-9 rounded-md text-sm transition-colors ${collapsed ? 'justify-center' : 'px-2.5'} ${
                isActive ? 'bg-raised text-fg font-medium' : 'text-fg-muted hover:text-fg hover:bg-raised/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent' : ''}`} aria-hidden />
                {!collapsed && <span>{name}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-line">
        <div className={`flex items-center gap-2.5 p-1.5 ${collapsed ? 'justify-center' : ''}`}>
          <Avatar name="Consultant 024" size="sm" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-fg truncate">Consultant 024</p>
              <p className="text-2xs text-fg-subtle truncate">Retail Lending</p>
            </div>
          )}
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`mt-1 w-full h-8 flex items-center gap-2 rounded-md text-[13px] text-fg-subtle hover:text-fg hover:bg-raised/60 ${collapsed ? 'justify-center' : 'px-2.5'}`}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            {!collapsed && 'Collapse'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Sidebar({ isMobileOpen, onCloseMobile, isCollapsed, onToggleCollapse }) {
  return (
    <>
      <aside
        className={`hidden lg:block shrink-0 sticky top-0 h-screen bg-canvas border-r border-line transition-[width] duration-200 ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        <SidebarContent collapsed={isCollapsed} onToggleCollapse={onToggleCollapse} />
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden bg-black/60 animate-fade-in" onClick={onCloseMobile}>
          <aside className="w-64 h-full bg-surface border-r border-line" onClick={(e) => e.stopPropagation()}>
            <SidebarContent collapsed={false} onNavigate={onCloseMobile} onClose={onCloseMobile} />
          </aside>
        </div>
      )}
    </>
  );
}
