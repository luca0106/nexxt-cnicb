import React, { useEffect, useState } from 'react';
import { CheckSquare, Clock, Plus, CheckCircle2, Folder } from 'lucide-react';
import { fetchTasks, toggleTask } from '../api/client';
import { Link } from 'react-router-dom';

export default function TasksList() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchTasks();
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (id) => {
    try {
      await toggleTask(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Sarcini Operaționale
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Activități de verificare și procesare asignate consultantului
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Se încarcă sarcinile...
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#090f1e] border border-[#142036] space-y-3">
          <CheckSquare className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-400 text-sm">Nicio sarcină înregistrată.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-4xl">
          {tasks.map((t) => (
            <div
              key={t.id}
              onClick={() => handleToggle(t.id)}
              className="p-4 rounded-2xl bg-[#090f1e] border border-[#142036] hover:border-[#1e3358] transition-all flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <input
                  type="checkbox"
                  checked={t.status === 'finalizat'}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <div>
                  <h3 className={`text-sm font-medium ${t.status === 'finalizat' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                    {t.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>Responsabil: <strong className="text-slate-300 font-normal">{t.assigned_to}</strong></span>
                    {t.due_date && (
                      <span>Termen: {new Date(t.due_date).toLocaleDateString('ro-RO')}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {t.case_id && (
                  <Link
                    to={`/dosare/${t.case_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>Dosar #{t.case_id}</span>
                  </Link>
                )}
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  t.status === 'finalizat'
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                    : 'bg-amber-950/40 text-amber-400 border border-amber-800/40'
                }`}>
                  {t.status === 'finalizat' ? 'Finalizat' : 'În lucru'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

