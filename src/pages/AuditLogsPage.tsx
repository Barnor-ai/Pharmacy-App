import React, { useState } from 'react';
import { usePharmacy } from '../context/PharmacyContext';
import { formatDateTime } from '../lib/formatters';
import { SearchInput } from '../components/SearchInput';
import { ShieldAlert, FileText, Activity } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const { auditLogs } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const filteredLogs = auditLogs.filter(l => {
    if (!trimmedQuery) return true;
    return (
      l.userName.toLowerCase().includes(trimmedQuery) ||
      l.action.toLowerCase().includes(trimmedQuery) ||
      (l.module && l.module.toLowerCase().includes(trimmedQuery)) ||
      (l.details && l.details.toLowerCase().includes(trimmedQuery)) ||
      (l.ipAddress && l.ipAddress.toLowerCase().includes(trimmedQuery))
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Security & Audit Logs</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Permanent immutable system log of all POS transactions, inventory updates & staff actions
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-md">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by user, action, module, details or IP..."
            totalCount={auditLogs.length}
            matchCount={filteredLogs.length}
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
              {filteredLogs.map((log, index) => (
                <tr key={`${log.id || 'log'}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
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
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        {searchQuery.trim() ? (
                          <>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">
                              No matching audit events found
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                              No audit records match "{searchQuery.trim()}". Try searching by user name, action, or module.
                            </p>
                            <div className="pt-2">
                              <button
                                onClick={() => setSearchQuery('')}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                              >
                                Clear Search
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">No audit events recorded</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                              Security audit records will appear here as users authenticate and perform system operations.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
