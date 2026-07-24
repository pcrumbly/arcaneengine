import { useState } from 'react';
import { LoaderCircle, Users } from 'lucide-react';

export default function PartySetup({ character, busy, onCreate }) {
  const [name,setName]=useState('');
  return <section className="rounded-lg border border-white/10 bg-runtime-surface p-5"><Users size={20} className="text-runtime-accent"/><h3 className="mt-3 font-semibold">Create a party</h3><p className="mt-1 text-sm text-slate-400">{character.name} will become the party leader.</p><form onSubmit={event=>{event.preventDefault();onCreate(name)}} className="mt-4 flex gap-2"><label className="sr-only" htmlFor="party-name">Party name</label><input id="party-name" required value={name} onChange={event=>setName(event.target.value)} placeholder="Party name" className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/[.025] px-3 py-2 text-sm"/><button disabled={busy||!name.trim()} className="flex items-center gap-2 rounded-md bg-runtime-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy&&<LoaderCircle size={14} className="animate-spin"/>}Create</button></form></section>;
}