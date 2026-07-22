import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { term } from '@/lib/runtimeManifest';

export default function CharacterSetup({ games, busy, onCreate }) {
  const [name,setName]=useState(''),[gameId,setGameId]=useState(games[0]?.id || '');
  const game=games.find(item=>item.id===gameId)||games[0],characterTerm=term(game,'character','Character');
  return <div className="mx-auto max-w-xl p-6 sm:p-12"><p className="text-xs uppercase tracking-[.24em] text-runtime-accent">{characterTerm} record</p><h2 className="mt-2 text-3xl font-semibold">Enter {game?.title || 'a published world'}</h2><p className="mt-3 text-slate-400">Create a persistent {characterTerm.toLowerCase()} from the selected game’s current content release.</p>
    <form onSubmit={(e)=>{e.preventDefault();onCreate({name,gameId})}} className="mt-8 space-y-4 rounded-lg border border-white/10 bg-runtime-surface p-5">
      <label className="block text-sm text-slate-300">Game<select required value={gameId} onChange={(e)=>setGameId(e.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-runtime px-3 py-2.5">{games.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
      <label className="block text-sm text-slate-300">{characterTerm} name<input required minLength={2} value={name} onChange={(e)=>setName(e.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-runtime px-3 py-2.5" placeholder="Name"/></label>
      <button disabled={busy||!games.length} className="flex w-full items-center justify-center gap-2 rounded-md bg-runtime-accent px-4 py-2.5 font-semibold text-slate-950 disabled:opacity-50">{busy&&<LoaderCircle className="animate-spin" size={16}/>}Create {characterTerm.toLowerCase()}</button>
    </form>
  </div>;
}