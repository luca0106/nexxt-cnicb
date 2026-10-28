import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, CaseStatusBadge, PRIORITY } from './ui';
import { money, relative, dateTime, text } from '../lib/format';

export default function CaseTable({ cases, compact = false }) {
  const navigate = useNavigate();
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-xs text-fg-subtle border-b border-line">
            <th scope="col" className="font-medium py-2.5 pl-4 sm:pl-0 pr-4">Case</th>
            <th scope="col" className="font-medium py-2.5 pr-4">Applicant</th>
            {!compact && <th scope="col" className="font-medium py-2.5 pr-4 hidden xl:table-cell">Product</th>}
            <th scope="col" className="font-medium py-2.5 pr-4 text-right">Amount</th>
            <th scope="col" className="font-medium py-2.5 pr-4">Status</th>
            <th scope="col" className="font-medium py-2.5 pr-4 sm:pr-0 text-right">Updated</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => {
            const priority = PRIORITY[c.priority];
            return (
              <tr
                key={c.id}
                onClick={() => navigate(`/cases/${c.id}`)}
                className="group border-b border-line last:border-0 hover:bg-surface cursor-pointer"
              >
                <td className="py-3 pl-4 sm:pl-0 pr-4 max-w-[320px]">
                  <Link
                    to={`/cases/${c.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-fg group-hover:underline underline-offset-2 decoration-fg-subtle"
                  >
                    #{c.case_number}
                  </Link>
                  {priority && c.priority !== 'normal' && (
                    <span className={`ml-2 text-2xs font-medium ${priority.tone === 'danger' ? 'text-danger' : 'text-warning'}`}>
                      {priority.label}
                    </span>
                  )}
                  <p className="text-[13px] text-fg-muted truncate" title={c.title}>
                    {text(c.title)}
                  </p>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={c.client?.full_name} size="sm" />
                    <span className="truncate max-w-[180px]">{text(c.client?.full_name)}</span>
                  </div>
                </td>
                {!compact && <td className="py-3 pr-4 text-fg-muted hidden xl:table-cell">{text(c.case_type)}</td>}
                <td className="py-3 pr-4 text-right tabular">{money(c.requested_amount, c.currency)}</td>
                <td className="py-3 pr-4">
                  <CaseStatusBadge status={c.status} />
                </td>
                <td className="py-3 pr-4 sm:pr-0 text-right text-fg-muted whitespace-nowrap" title={dateTime(c.updated_at || c.created_at)}>
                  {relative(c.updated_at || c.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
