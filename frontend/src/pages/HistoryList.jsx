import React, { useEffect, useState } from 'react';
import { History, Clock, Folder } from 'lucide-react';
import { fetchHistory } from '../api/client';
import { Link } from 'react-router-dom';

export default function HistoryList() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchHistory();
        setHistory(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Jurnal Istoric Activitate
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Audit trail al tuturor acțiunilor și modificărilor operate în sistem
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Se încarcă istoricul...
        </div>
      ) : history.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#090f1e] border border-[#142036] space-y-3">
          <History className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-400 text-sm">Nicio acțiune înregistrată încă în jurnal.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-4xl">
          {history.map((h) => (
            <div
              key={h.id}
              className="p-4 rounded-2xl bg-[#090f1e] border border-[#142036] flex items-start gap-4"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-950/40 border border-blue-900/50 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">
                    {h.action}
                  </span>
                  <span className="text-slate-500 font-mono">
                    {new Date(h.timestamp).toLocaleString('ro-RO')}
                  </span>
                </div>
                <p className="text-slate-300 mt-1">
                  {h.details}
                </p>
                <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                  <span>Utilizator: <strong className="text-slate-400 font-medium">{h.performed_by}</strong></span>
                  {h.case_id && (
                    <Link
                      to={`/dosare/${h.case_id}`}
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Folder className="w-3 h-3" />
                      <span>Vezi Dosar #{h.case_id}</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

