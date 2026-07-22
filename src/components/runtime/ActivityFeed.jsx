import { CheckCircle2, Radio } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ActivityFeed({ events }) {
  return <aside className="rounded-lg border border-white/10 bg-[#0a1728] p-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><Radio size={15} className="text-cyan-400"/> Recent events</h3><div className="mt-4 space-y-4">{events.length ? events.map((event) => <div key={event.id} className="flex gap-2.5"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400"/><div><p className="text-xs font-medium">{event.command.replaceAll('_', ' ')}</p><p className="mt-0.5 text-[11px] text-slate-500">{formatDistanceToNow(new Date(event.occurred_at), { addSuffix: true })}</p></div></div>) : <p className="text-xs leading-5 text-slate-500">Resolved commands will appear here as an immutable activity trail.</p>}</div></aside>;
}