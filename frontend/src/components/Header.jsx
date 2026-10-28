import React from 'react';
import { Landmark, User, Bot, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Header({ onToggleMobileMenu, isSidebarCollapsed, onToggleSidebarCollapse }) {
  return (
    <header className="bg-[#0b1426] border-b border-[#172338] px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-30">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg bg-[#111c33] border border-[#1e2f50] text-slate-300 hover:text-white transition-colors"
          aria-label="Deschide meniul"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop sidebar collapse toggle */}
        <button
          onClick={onToggleSidebarCollapse}
          className="hidden lg:flex p-2 rounded-lg bg-[#111c33]/70 hover:bg-[#111c33] border border-[#1e2f50]/70 text-slate-400 hover:text-white transition-colors"
          title={isSidebarCollapsed ? 'Extinde meniul lateral' : 'Restrânge meniul lateral'}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:text-blue-300 transition-colors shrink-0">
            <Landmark className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 leading-tight">
              BankDesk
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-normal truncate max-w-[200px] sm:max-w-none">
              Sistem intern de gestionare a clienților și dosarelor
            </p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-xs text-amber-300 font-medium"
          title="Extensia Raiffeisen AI Copilot — Triage & Audit este activă pe pagina fiecărui dosar"
        >
          <Bot className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className=" whitespace-nowrap">Raiffeisen AI Copilot</span>
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
        </div>

        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-[#111c33] border border-[#1e2f50] text-xs sm:text-sm text-slate-200">
          <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium whitespace-nowrap">
            <span className="hidden sm:inline">Utilizator: </span>Consultant 024
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Activ"></span>
        </div>
      </div>
    </header>
  );
}
