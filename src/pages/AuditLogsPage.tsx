import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { formatDateTime } from '../lib/formatters';
import { ShieldAlert, Search, FileText, Activity } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const { auditLogs } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = auditLogs.filter(l =>
    l.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.details.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Security & Audit Logs</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Permanent immutable system log of all POS transactions, inventory updates & staff actions
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit trail..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3 rounded-l-xl">Timestamp</th>
                <th className="p-3">User</th>
                <th className="p-3">Action</th>
                <th className="p-3">Module</th>
                <th className="p-3">Details</th>
                <th className="p-3 text-right rounded-r-xl">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="p-3 font-mono text-[11px] text-slate-500">{formatDateTime(log.timestamp)}</td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white">{log.userName}</td>
                  <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">{log.action}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {log.module}
                    </span>
                  </td>
                  <td className="p-3 max-w-xs truncate text-slate-700 dark:text-slate-300">{log.details}</td>
                  <td className="p-3 text-right font-mono text-[11px] text-slate-400">{log.ipAddress || '192.168.1.10'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
