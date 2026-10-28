import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchStats } from '../api/client';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchStats();
      setStats(data);
    } catch (err) {
      console.error(err);
      setError('Nu s-au putut prelua datele de pe server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_verificare':
        return (
          <span className="px-3.5 py-1 rounded-full text-xs font-medium bg-[#2e1906] text-[#f97316] border border-[#7c2d12]/60">
            În verificare
          </span>
        );
      case 'complet':
        return (
          <span className="px-3.5 py-1 rounded-full text-xs font-medium bg-[#052e16] text-[#22c55e] border border-[#14532d]/60">
            Complet
          </span>
        );
      case 'in_asteptare':
        return (
          <span className="px-3.5 py-1 rounded-full text-xs font-medium bg-[#1e293b] text-[#cbd5e1] border border-[#334155]/60">
            În așteptare
          </span>
        );
      case 'in_lucru':
        return (
          <span className="px-3.5 py-1 rounded-full text-xs font-medium bg-[#0f2347] text-[#38bdf8] border border-[#1e3a8a]/60">
            În lucru
          </span>
        );
      case 'respins':
        return (
          <span className="px-3.5 py-1 rounded-full text-xs font-medium bg-[#3b0b14] text-[#f87171] border border-[#7f1d1d]/60">
            Respins
          </span>
        );
      default:
        return (
          <span className="px-3.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Dosare în lucru
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Situația activității din departament
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0e1626] border border-[#1a2842] hover:bg-[#152037] text-xs text-slate-300 transition-colors"
          title="Reîmprospătează datele"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizează</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards - 2 Cards side by side like screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
        {/* Card 1: În lucru */}
        <div 
          onClick={() => navigate('/dosare?status=in_lucru')}
          className="p-6 rounded-2xl bg-[#090f1e] border border-[#142036] hover:border-blue-500/30 transition-all cursor-pointer group shadow-sm"
        >
          <div className="text-sm font-normal text-slate-400">
            În lucru
          </div>
          <div className="text-4xl md:text-5xl font-bold text-[#2563eb] mt-3 group-hover:scale-105 transition-transform duration-200">
            {loading && !stats ? '...' : (stats?.in_lucru ?? 24)}
          </div>
        </div>

        {/* Card 2: De verificat */}
        <div 
          onClick={() => navigate('/dosare?status=in_verificare')}
          className="p-6 rounded-2xl bg-[#090f1e] border border-[#142036] hover:border-amber-500/30 transition-all cursor-pointer group shadow-sm"
        >
          <div className="text-sm font-normal text-slate-400">
            De verificat
          </div>
          <div className="text-4xl md:text-5xl font-bold text-[#d97706] mt-3 group-hover:scale-105 transition-transform duration-200">
            {loading && !stats ? '...' : (stats?.de_verificat ?? 7)}
          </div>
        </div>
      </div>

      {/* Section: Dosare recente */}
      <div className="space-y-4 max-w-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white tracking-tight">
            Dosare recente
          </h2>
          <button
            onClick={() => navigate('/dosare')}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            Vezi toate dosarele
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {loading && !stats ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Se încarcă dosarele...
            </div>
          ) : stats?.recent_cases && stats.recent_cases.length > 0 ? (
            stats.recent_cases.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/dosare/${c.id}`)}
                className="p-4 rounded-2xl bg-[#090f1e] border border-[#142036] hover:border-[#1e3256] hover:bg-[#0c1428] transition-all cursor-pointer flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-xl bg-blue-950/40 border border-blue-900/40 flex items-center justify-center text-blue-400 group-hover:text-blue-300 transition-colors">
                    <Folder className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                      Dosar #{c.case_number}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {c.title}
                    </p>
                  </div>
                </div>

                <div>
                  {getStatusBadge(c.status)}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm rounded-2xl bg-[#090f1e] border border-[#142036]">
              Nu există dosare recente înregistrate.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

