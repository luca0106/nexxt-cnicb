import React from 'react';
import {
  Landmark,
  User,
  Bot,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Code2,
  ExternalLink,
  Power
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useExternalPlugin } from '../plugin/PluginContext';

export default function Header({ onToggleMobileMenu, isSidebarCollapsed, onToggleSidebarCollapse }) {
  const navigate = useNavigate();
  const {
    isPluginConnected,
    togglePluginConnection,
    setIsIntegrationModalOpen
  } = useExternalPlugin();

  return (
    <header className="bg-[#0b1426] border-b border-[#172338] px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-md sticky top-0 z-30">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg bg-[#111c33] border border-[#1e2f50] text-slate-300 hover:text-white transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={onToggleSidebarCollapse}
          className="hidden lg:flex p-2 rounded-lg bg-[#111c33]/70 hover:bg-[#111c33] border border-[#1e2f50]/70 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
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
              Internal client & case management system
            </p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* External B2B Plugin Control Group */}
        <div className="hidden md:flex items-center gap-1.5 p-1 rounded-full bg-[#070d1b] border border-[#1a2946]">
          <button
            onClick={togglePluginConnection}
            title={
              isPluginConnected
                ? 'Click to disconnect External AI Plugin (Demo Pure Banking CRM Mode)'
                : 'Click to connect External AI Plugin via REST API'
            }
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              isPluginConnected
                ? 'bg-amber-400/15 border border-amber-400/40 text-amber-300 hover:bg-amber-400/25'
                : 'bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Power className={`w-3.5 h-3.5 ${isPluginConnected ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>{isPluginConnected ? 'External AI Plugin: Connected' : 'AI Plugin: Disconnected (Pure CRM)'}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isPluginConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
          </button>

          <button
            onClick={() => setIsIntegrationModalOpen(true)}
            title="View B2B External Plugin Architecture, SDK Snippet & REST API Spec"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#111c33] hover:bg-[#19294b] border border-[#22365e] text-[11px] font-semibold text-blue-300 transition-colors cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>SDK & API</span>
          </button>

          <button
            onClick={() => navigate('/plugin')}
            title="Launch Standalone B2B Plugin Console (Decoupled from BankDesk CRM)"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-bold transition-colors cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Standalone Plugin</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-[#111c33] border border-[#1e2f50] text-xs sm:text-sm text-slate-200">
          <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium whitespace-nowrap">
            <span className="hidden sm:inline">User: </span>Consultant 024
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Active"></span>
        </div>
      </div>
    </header>
  );
}
