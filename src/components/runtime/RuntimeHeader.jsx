import { Activity, Coins, LogOut, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import NotificationCenter from '@/components/runtime/NotificationCenter';
import { term } from '@/lib/runtimeManifest';

export default function RuntimeHeader({ state, game }) {
  const character=state?.character, indicators=new Set(game?.header_indicators || ['character','location','resource','currency']);
  const resource=character ? Object.entries(character.resources || {})[0] : null;
  const currency=character ? Object.values(character.currency || {}).reduce((sum,value)=>sum+value,0) : null;
  return <header className="min-h-16 border-b border-white/10 bg-runtime-surface px-4 py-2 sm:px-6 flex items-center justify-between gap-4">
    <div><p className="text-[10px] uppercase tracking-[.28em] text-runtime-accent">RPG Runtime</p><h1 className="font-semibold tracking-tight">{game?.title || 'RPG Runtime'}</h1></div>
    <div className="hidden lg:flex items-center gap-4 text-xs text-slate-400">
      {character && indicators.has('character') && <span>{term(game,'character','Character',state?.translations)}: <b className="text-runtime-text">{character.name}</b></span>}
      {state?.location && indicators.has('location') && <span className="flex gap-1"><MapPin size={14}/>{state.location.name}</span>}
      {resource && indicators.has('resource') && <span className="flex gap-1 capitalize"><Activity size={14}/>{resource[0]} {resource[1]}</span>}
      {currency !== null && indicators.has('currency') && <span className="flex gap-1"><Coins size={14}/>{currency}</span>}
    </div>
    <div className="flex items-center gap-2"><NotificationCenter/><button onClick={() => base44.auth.logout('/login')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-runtime-text"><LogOut size={16}/><span className="hidden sm:inline">Sign out</span></button></div>
  </header>;
}