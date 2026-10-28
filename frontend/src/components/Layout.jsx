import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col font-sans overflow-x-hidden">
      <Header
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex flex-1 min-w-0">
        <Sidebar
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          isCollapsed={isSidebarCollapsed}
        />
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 w-full max-w-[1600px] mx-auto flex flex-col justify-between">
          <div className="min-w-0 w-full">
            <Outlet context={{ isSidebarCollapsed, setIsSidebarCollapsed }} />
          </div>
          <footer className="mt-10 pt-5 border-t border-[#121c2e] text-center">
            <p className="text-xs text-slate-500">
              Conceptual mockup — synthetic demo data, not a real banking production record.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
