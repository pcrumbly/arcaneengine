import { useState } from 'react';
import { LoaderCircle, Users } from 'lucide-react';

export default function PartySetup({ character, busy, onCreate }) {
  const [name,setName]=useState('');
  return <section className="rounded-lg border border-white/10 bg-[#0a1728] p-5"><Users size={20} className="text-cyan-400"/><h3 className="mt-3 font-semibold">Create a party</h3><p className="mt-1 text-sm text-slate-400">{character.name} will become the party leader.</p><div className="mt-4 flex gap-2"><input value={name} onChange={(event)=>setName(event.target.value)} placeholder="Party name" className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/[.025] px-3 py-2 text-sm"/><button disabled={busy||!name.trim()} onClick={()=>onCreate(name)} className="flex items-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy&&<LoaderCircle size={14} className="animate-spin"/>}Create</button></div></section>;
}