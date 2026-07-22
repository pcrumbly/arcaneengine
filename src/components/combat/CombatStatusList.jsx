import { Clock3, Layers3 } from 'lucide-react';

export default function CombatStatusList({effects=[]}) {
  if (!effects.length) return null;
  return <div className="mt-2 flex flex-wrap gap-1.5">{effects.map((effect) => <span key={effect.id} title={effect.definition?.description || effect.status_key} className="inline-flex items-center gap-1 rounded border border-amber-300/20 bg-amber-300/10 px-1.5 py-1 text-[10px] text-amber-200"><span>{effect.definition?.name || effect.status_key}</span>{effect.stacks > 1 && <span className="inline-flex items-center gap-0.5"><Layers3 size={9}/>{effect.stacks}</span>}{Number.isFinite(effect.remaining_turns) && <span className="inline-flex items-center gap-0.5"><Clock3 size={9}/>{effect.remaining_turns}</span>}</span>)}</div>;
}