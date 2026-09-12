import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

export function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return <>{Array.from({ length: rows }, (_, row) => <tr key={row} className="animate-pulse border-b border-slate-100 dark:border-slate-800/70">
    {Array.from({ length: columns }, (_, column) => <td key={column} className="p-4"><div className={`h-3 rounded-full bg-slate-200 dark:bg-slate-800 ${column === 0 ? 'w-4/5' : 'w-3/5'}`} /></td>)}
  </tr>)}</>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
    <div className="mb-4 rounded-2xl bg-red-500/10 p-4 text-red-600 dark:text-red-400"><Inbox size={30} /></div>
    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
    <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>;
}
