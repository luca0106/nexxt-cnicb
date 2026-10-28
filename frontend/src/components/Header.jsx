import React from 'react';
import { Landmark, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="bg-[#0b1426] border-b border-[#172338] px-6 py-4 flex items-center justify-between shadow-md">
      <Link to="/" className="flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:text-blue-300 transition-colors">
          <Landmark className="w-6 h-6" />
        </div>
        <div>
          <div className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            BankDesk
          </div>
          <p className="text-xs text-slate-400 font-normal">
            Sistem intern de gestionare a clienților și dosarelor
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111c33] border border-[#1e2f50] text-sm text-slate-200">
          <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium text-xs md:text-sm">Utilizator: Consultant 024</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" title="Activ"></span>
        </div>
      </div>
    </header>
  );
}

