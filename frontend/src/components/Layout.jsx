import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar, { BrandMark } from './Sidebar';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:rounded-md focus:bg-accent focus:text-accent-fg">
        Skip to content
      </a>
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-30 h-14 flex items-center gap-3 px-4 bg-canvas/95 backdrop-blur border-b border-line">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
            className="w-9 h-9 -ml-1.5 inline-flex items-center justify-center rounded-md text-fg-muted hover:bg-raised"
          >
            <Menu className="w-5 h-5" />
          </button>
          <BrandMark />
          <span className="text-[15px] font-semibold">BankDesk</span>
        </header>

        <main id="main" className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <Outlet context={{ isSidebarCollapsed, setIsSidebarCollapsed }} />
        </main>

        <footer className="px-4 sm:px-6 lg:px-8 py-4 text-2xs text-fg-subtle">
          Demo environment. All clients, documents and cases are fictional.
        </footer>
      </div>
    </div>
  );
}
