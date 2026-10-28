import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutGrid, 
  Users, 
  Folder, 
  FileText, 
  CheckSquare, 
  History 
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutGrid },
  { name: 'Clienți', path: '/clienti', icon: Users },
  { name: 'Dosare', path: '/dosare', icon: Folder },
  { name: 'Documente', path: '/documente', icon: FileText },
  { name: 'Sarcini', path: '/sarcini', icon: CheckSquare },
  { name: 'Istoric', path: '/istoric', icon: History },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#050811] border-r border-[#121c2e] p-6 flex flex-col justify-between shrink-0 min-h-[calc(100vh-73px)]">
      <div>
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4 px-3">
          Meniu
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="pt-6 border-t border-[#121c2e] text-xs text-slate-500 px-3">
        <p className="font-semibold text-slate-400">Departament Retail</p>
        <p className="text-[11px] text-slate-600 mt-0.5">Versiunea v1.0.0 (Core)</p>
      </div>
    </aside>
  );
}

