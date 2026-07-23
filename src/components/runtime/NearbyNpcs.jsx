import { ChevronRight, UserRound } from 'lucide-react';

export default function NearbyNpcs({ npcs, busy, onNpc }) {
  return <div className="border-b border-white/10 p-5">
    <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><UserRound size={16} className="text-runtime-accent"/> People here</div>
    {npcs.length ? <div className="grid gap-2 sm:grid-cols-2">{npcs.map(({ placement, definition, can_interact, actions = [] }) => {
      const available = actions.length;
      return <button key={placement.id} disabled={busy || !can_interact} onClick={() => onNpc(placement.id)} aria-label={`Open ${definition.name}'s profile`} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[.025] p-3 text-left transition-colors hover:border-runtime-accent/40 hover:bg-runtime-accent/5 disabled:cursor-not-allowed disabled:opacity-50">
        <span className="min-w-0"><strong className="block text-sm">{definition.name}</strong><span className="mt-0.5 block truncate text-xs text-slate-500">{definition.description || 'No description available.'}</span></span>
        <span className="flex shrink-0 items-center gap-1 text-[11px] text-runtime-accent">{can_interact ? (available ? `${available} interaction${available === 1 ? '' : 's'}` : 'View profile') : 'Unavailable'}<ChevronRight size={14}/></span>
      </button>;
    })}</div> : <p className="rounded-md border border-dashed border-white/10 p-4 text-sm text-slate-500">No one is currently visible here.</p>}
  </div>;
}