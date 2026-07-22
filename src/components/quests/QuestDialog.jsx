import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, Circle, LoaderCircle } from 'lucide-react';

export default function QuestDialog({ quest, available, busy, onClose, onAction }) {
  if (!quest) return null;
  const definition = quest.definition || quest;
  const objectives = quest.objectives || definition.objective_graph?.objectives || [];
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="border-white/10 bg-[#0a1728] text-slate-100 sm:max-w-xl"><DialogHeader><DialogTitle>{definition.name}</DialogTitle><DialogDescription className="text-slate-400">{definition.description}</DialogDescription></DialogHeader>
    <div><p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Objectives</p><div className="space-y-2">{objectives.map((objective) => { const complete = objective.state === 'COMPLETED'; return <div key={objective.id || objective.key} className="flex items-center gap-2 text-sm">{complete ? <Check size={15} className="text-emerald-400"/> : <Circle size={13} className="text-slate-600"/>}<span className={complete ? 'text-slate-500 line-through' : ''}>{objective.label || objective.objective_key}</span>{objective.required_count > 1 && <span className="text-xs text-slate-500">{objective.current_count || 0}/{objective.required_count}</span>}{objective.state === 'PENDING' && <span className="text-xs text-amber-300">Locked</span>}{objective.optional && <span className="text-xs text-slate-600">Optional</span>}</div>; })}</div></div>
    {!!definition.rewards?.length && <div><p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Rewards</p>{definition.rewards.map((reward, index) => <p key={index} className="text-sm text-cyan-300">{reward.amount} {reward.currencyId || reward.resourceId}</p>)}</div>}
    <div className="flex justify-end">{available ? <Action busy={busy} onClick={() => onAction('ACCEPT_QUEST')}>Accept quest</Action> : quest.state === 'ACTIVE' ? <Action busy={busy} danger onClick={() => onAction('ABANDON_QUEST')}>Abandon quest</Action> : <span className="text-sm capitalize text-slate-400">{quest.state.toLowerCase()}</span>}</div>
  </DialogContent></Dialog>;
}
function Action({children,onClick,busy,danger}) { return <button disabled={busy} onClick={onClick} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${danger ? 'border border-red-400/20 text-red-300' : 'bg-cyan-400 text-slate-950'}`}>{busy && <LoaderCircle size={14} className="animate-spin"/>}{children}</button>; }