import { Redo2, Undo2 } from 'lucide-react';

export default function DraftHistoryToolbar({ dirty, canUndo, canRedo, onUndo, onRedo }) {
  return <div className="flex items-center justify-between rounded-lg border border-white/10 bg-runtime-surface px-3 py-2">
    <span className={`text-xs ${dirty ? 'text-amber-300' : 'text-slate-500'}`}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
    <div className="flex gap-1">
      <button type="button" disabled={!canUndo} onClick={onUndo} className="rounded p-2 text-slate-300 hover:bg-white/5 disabled:opacity-30" aria-label="Undo draft change" title="Undo"><Undo2 size={15}/></button>
      <button type="button" disabled={!canRedo} onClick={onRedo} className="rounded p-2 text-slate-300 hover:bg-white/5 disabled:opacity-30" aria-label="Redo draft change" title="Redo"><Redo2 size={15}/></button>
    </div>
  </div>;
}