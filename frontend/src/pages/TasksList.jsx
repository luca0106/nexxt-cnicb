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

  const isCompleted = (status) => status === 'completed' || status === 'finalizat';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Operational Tasks
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Verification activities and triage checkpoints assigned to loan officers
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Loading assigned tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#090f1e] border border-[#142036] space-y-3">
          <CheckSquare className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-400 text-sm">No tasks currently recorded.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-4xl">
          {tasks.map((t) => {
            const completed = isCompleted(t.status);
            return (
              <div
                key={t.id}
                onClick={() => handleToggle(t.id)}
                className="p-4 rounded-2xl bg-[#090f1e] border border-[#142036] hover:border-[#1e3358] transition-all flex items-center justify-between cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  <input
                    type="checkbox"
                    checked={completed}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <h3 className={`text-sm font-medium ${completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {t.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span>Assigned: <strong className="text-slate-300 font-normal">{t.assigned_to}</strong></span>
                      {t.due_date && (
                        <span>Due: {new Date(t.due_date).toLocaleDateString('en-US')}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {t.case_id && (
                    <Link
                      to={`/cases/${t.case_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Folder className="w-3.5 h-3.5" />
                      <span>Case #{t.case_id}</span>
                    </Link>
                  )}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    completed
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                      : 'bg-amber-950/40 text-amber-400 border border-amber-800/40'
                  }`}>
                    {completed ? 'Completed' : 'In progress'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
