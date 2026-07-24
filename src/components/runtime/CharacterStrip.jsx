import { Activity, Coins, MapPin, Shield } from 'lucide-react';
import { term } from '@/lib/runtimeManifest';

export default function CharacterStrip({ character, location, characters, game, busy, onSelect }) {
  const primary=game?.rules?.primary_resource_key || Object.keys(character.resources || {})[0], current=character.resources?.[primary] ?? 0, maximum=game?.character_defaults?.resources?.[primary];
  return <section className="grid gap-3 border-y border-white/10 bg-runtime-surface p-4 sm:grid-cols-[1.4fr_repeat(3,1fr)]">
    <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-md bg-runtime-accent/15 text-runtime-accent font-bold">{character.name.slice(0,2).toUpperCase()}</div><div><select disabled={busy} aria-label={`Active ${term(game,'character','character')}`} value={character.id} onChange={(e) => onSelect(e.target.value)} className="bg-transparent font-semibold outline-none">{characters.map((item) => <option className="bg-runtime-surface" value={item.id} key={item.id}>{item.name}</option>)}</select><p className="text-xs text-slate-500">Content {character.content_version}</p></div></div>
    <Metric icon={MapPin} label={term(game,'location','Location')} value={location?.name || 'Unknown'}/>
    <Metric icon={Activity} label={primary || 'Resource'} value={maximum===undefined?current:`${current} / ${maximum}`}/>
    <div className="grid grid-cols-2 gap-3"><Metric icon={Shield} label="State" value={character.status}/><Metric icon={Coins} label={term(game,'currency','Funds')} value={Object.values(character.currency || {}).reduce((a,b) => a+b, 0)}/></div>
  </section>;
}
function Metric({ icon: Icon, label, value }) { return <div className="rounded-md border border-white/10 bg-white/[.025] px-3 py-2"><p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500"><Icon size={12}/>{label}</p><p className="mt-1 truncate text-sm font-medium capitalize">{value}</p></div>; }