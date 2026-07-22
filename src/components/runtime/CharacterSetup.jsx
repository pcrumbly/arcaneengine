import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';

export default function CharacterSetup({ games, busy, onCreate }) {
  const [name, setName] = useState('');
  const [gameId, setGameId] = useState(games[0]?.id || '');
  return <div className="mx-auto max-w-xl p-6 sm:p-12"><p className="text-xs uppercase tracking-[.24em] text-cyan-400">Character record</p><h2 className="mt-2 text-3xl font-semibold">Enter a published world</h2><p className="mt-3 text-slate-400">Create a persistent character from the selected game's current content release.</p>
    <form onSubmit={(e) => { e.preventDefault(); onCreate({ name, gameId }); }} className="mt-8 space-y-4 rounded-lg border border-white/10 bg-[#0a1728] p-5">
      <label className="block text-sm text-slate-300">Game<select required value={gameId} onChange={(e) => setGameId(e.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-[#07111f] px-3 py-2.5">{games.map((game) => <option value={game.id} key={game.id}>{game.title}</option>)}</select></label>
      <label className="block text-sm text-slate-300">Character name<input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-[#07111f] px-3 py-2.5" placeholder="Name"/></label>
      <button disabled={busy || !games.length} className="flex w-full items-center justify-center gap-2 rounded-md bg-cyan-400 px-4 py-2.5 font-semibold text-slate-950 disabled:opacity-50">{busy && <LoaderCircle className="animate-spin" size={16}/>} Create character</button>
    </form>
  </div>;
}