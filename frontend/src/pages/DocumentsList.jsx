import React, { useEffect, useState } from 'react';
import { FileText, Eye, X, Folder, Calendar } from 'lucide-react';
import { fetchDocuments } from '../api/client';
import { Link } from 'react-router-dom';

export default function DocumentsList() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchDocuments();
        setDocuments(data);
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
          Registered Documents
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Supporting verification files and applicant records attached to credit files
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          Loading document repository...
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#090f1e] border border-[#142036] space-y-3">
          <FileText className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-400 text-sm">No documents found in the system.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-5 rounded-2xl bg-[#090f1e] border border-[#142036] hover:border-[#1e3358] transition-all flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-950/40 border border-blue-900/40 flex items-center justify-center text-blue-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {doc.file_size_kb} KB
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white truncate" title={doc.file_name}>
                    {doc.file_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Type: <span className="text-slate-300 font-medium">{doc.document_type}</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#142036] flex items-center justify-between">
                <Link
                  to={`/cases/${doc.case_id}`}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>View Case</span>
                </Link>

                <button
                  onClick={() => setSelectedDoc(doc)}
                  className="px-3 py-1.5 rounded-lg bg-[#111c33] border border-[#1e2f50] text-xs font-medium text-slate-200 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Content</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0b1224] border border-[#1d2d4c] rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">{selectedDoc.file_name}</h3>
                <p className="text-xs text-slate-400">{selectedDoc.document_type}</p>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Extracted Text Content:
              </span>
              <pre className="p-4 rounded-xl bg-[#050811] border border-[#192742] text-xs text-slate-200 font-mono whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                {selectedDoc.content_text || 'No OCR/text content pre-extracted for this file.'}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
