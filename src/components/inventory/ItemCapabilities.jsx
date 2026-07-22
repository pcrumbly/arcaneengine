import { Sparkles } from 'lucide-react';

export default function ItemCapabilities({item}){
  const abilities=item.granted_abilities||[];
  if(!abilities.length)return null;
  return <section><p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Granted abilities</p><div className="space-y-2">{abilities.map(ability=><div key={ability.id} className="rounded-md border border-violet-400/20 bg-violet-400/5 p-3"><p className="flex items-center gap-2 text-sm font-medium text-violet-200"><Sparkles size={14}/>{ability.name}</p>{ability.description&&<p className="mt-1 text-xs text-slate-400">{ability.description}</p>}{ability.tags?.length>0&&<p className="mt-2 text-[11px] text-slate-500">{ability.tags.join(' · ')}</p>}</div>)}</div></section>;
}