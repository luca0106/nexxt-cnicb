import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col font-sans">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full flex flex-col justify-between">
          <div>
            <Outlet />
          </div>
          <footer className="mt-12 pt-6 border-t border-[#121c2e] text-center">
            <p className="text-xs text-slate-500">
              Mockup conceptual — date și elemente fictive, nu o captură dintr-un sistem bancar real.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

