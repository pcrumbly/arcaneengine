import { Search } from 'lucide-react';

export default function NpcInspectAction({ action, busy, onSelect }) {
  return <button disabled={busy} onClick={() => onSelect(action)} className="flex items-start gap-3 rounded-md border border-white/10 p-3 text-left hover:border-cyan-400/40 hover:bg-cyan-400/5 disabled:opacity-50"><Search size={16} className="mt-0.5 text-runtime-accent"/><span><strong className="block text-sm">{action.label}</strong>{action.description&&<span className="block text-xs text-slate-500">{action.description}</span>}</span></button>;
}