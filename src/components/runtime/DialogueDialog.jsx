import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoaderCircle, MessageSquare } from 'lucide-react';

export default function DialogueDialog({ dialogue, busy, error, onSelect, onClose }) {
  if (!dialogue) return null;
  const complete = dialogue.session.state === 'COMPLETED';
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="border-white/10 bg-[#0a1728] text-slate-100 sm:max-w-xl"><DialogHeader><DialogTitle>{dialogue.npc.definition.name}</DialogTitle><DialogDescription className="text-slate-400">{dialogue.npc.definition.description || dialogue.graph.name}</DialogDescription></DialogHeader>
    <div className="rounded-md border border-white/10 bg-white/[.025] p-4"><div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-cyan-400"><MessageSquare size={14}/> Conversation</div><p className="leading-7 text-slate-200">{complete ? 'The conversation has ended.' : dialogue.node?.text}</p></div>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <div className="grid gap-2">{!complete && dialogue.options.map((option) => <button key={option.key} disabled={busy} onClick={() => onSelect(option.key)} className="flex items-center justify-between rounded-md border border-white/10 px-4 py-3 text-left text-sm hover:border-cyan-400/40 hover:bg-cyan-400/5 disabled:opacity-50"><span>{option.label}</span>{busy && <LoaderCircle size={15} className="animate-spin"/>}</button>)}</div>
    {complete && <div className="flex justify-end"><button onClick={onClose} className="rounded-md bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950">Close</button></div>}
  </DialogContent></Dialog>;
}