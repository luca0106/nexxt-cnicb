import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { fetchDocuments } from '../api/client';
import { useAsync } from '../lib/useAsync';
import { dateTime, humanize, number, relative } from '../lib/format';
import { Badge, Button, Dialog, EmptyState, ErrorState, PageHeader, SkeletonRows } from '../components/ui';

const STATUS_TONE = { expired: 'danger', flagged: 'warning', verified: 'success' };
const stripPrefix = (line) => line.replace(/^Line\s+\d+\s*:\s?/, '');

export default function DocumentsList() {
  const { data: docs, loading, error, reload } = useAsync(() => fetchDocuments(), []);
  const [open, setOpen] = useState(null);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Documents" description={docs ? `${number(docs.length)} files attached to cases` : 'Files attached to cases'} />

      {error && !docs ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !docs ? (
        <SkeletonRows rows={8} />
      ) : docs.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet" description="Documents attached to a case appear here." />
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-left text-xs text-fg-subtle border-b border-line">
                <th scope="col" className="font-medium py-2.5 pl-4 sm:pl-0 pr-4">Document</th>
                <th scope="col" className="font-medium py-2.5 pr-4">Status</th>
                <th scope="col" className="font-medium py-2.5 pr-4 text-right">Size</th>
                <th scope="col" className="font-medium py-2.5 pr-4 text-right">Added</th>
                <th scope="col" className="py-2.5 pr-4 sm:pr-0"><span className="sr-only">Case</span></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-0 hover:bg-surface">
                  <td className="py-3 pl-4 sm:pl-0 pr-4 max-w-[360px]">
                    <button type="button" onClick={() => setOpen(d)} className="text-left group">
                      <span className="block font-medium group-hover:underline underline-offset-2 decoration-fg-subtle">{d.document_type}</span>
                      <span className="block text-xs text-fg-subtle truncate" title={d.file_name}>
                        {d.file_name}
                      </span>
                    </button>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge tone={STATUS_TONE[d.status] || 'neutral'}>{humanize(d.status)}</Badge>
                  </td>
                  <td className="py-3 pr-4 text-right tabular text-fg-muted">{number(d.file_size_kb)} KB</td>
                  <td className="py-3 pr-4 text-right text-fg-muted whitespace-nowrap" title={dateTime(d.created_at)}>
                    {relative(d.created_at)}
                  </td>
                  <td className="py-3 pr-4 sm:pr-0 text-right">
                    <Link to={`/cases/${d.case_id}`} className="text-[13px] text-fg-muted hover:text-fg whitespace-nowrap">
                      Open case
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        size="lg"
        title={open?.document_type}
        description={open?.file_name}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(null)}>
              Close
            </Button>
            {open && (
              <Link to={`/cases/${open.case_id}`} className="h-9 px-3.5 inline-flex items-center rounded-md bg-raised border border-line text-sm font-medium hover:bg-hover">
                Open case
              </Link>
            )}
          </>
        }
      >
        {open?.content_text ? (
          <ol className="font-mono text-[12.5px] leading-6 rounded-md border border-line bg-canvas py-2">
            {open.content_text.split('\n').map((line, i) => (
              <li key={i} className="flex gap-4 pr-4">
                <span className="w-9 shrink-0 text-right text-fg-subtle select-none">{i + 1}</span>
                <span className="text-fg-muted whitespace-pre-wrap break-words min-w-0">{stripPrefix(line) || ' '}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-fg-muted">This file has no extracted text.</p>
        )}
      </Dialog>
    </div>
  );
}
