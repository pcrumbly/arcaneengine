import { LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import NotificationCenter from '@/components/runtime/NotificationCenter';
import RuntimeIndicators from '@/components/runtime/RuntimeIndicators';
import { useRuntimeText } from '@/lib/RuntimeI18nContext';

export default function RuntimeHeader({ state, game }) {
  const text=useRuntimeText();
  return <header className="min-h-16 border-b border-white/10 bg-runtime-surface px-4 py-2 sm:px-6 flex items-center justify-between gap-4">
    <div><p className="text-[10px] uppercase tracking-[.28em] text-runtime-accent">RPG Runtime</p><h1 className="font-semibold tracking-tight">{game?.title || 'RPG Runtime'}</h1></div>
    <RuntimeIndicators state={state} game={game}/>
    <div className="flex items-center gap-2"><NotificationCenter/><button onClick={() => base44.auth.logout('/login')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-runtime-text"><LogOut size={16}/><span className="hidden sm:inline">{text('action.sign_out','Sign out')}</span></button></div>
  </header>;
}