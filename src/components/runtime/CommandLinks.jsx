import { Award,BookOpen,Map,MessageSquare,ScrollText,Shield,UserRound,WandSparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { resolveNavigation } from '@/lib/runtimeManifest';
const icons={world:Map,characters:UserRound,quests:ScrollText,achievements:Award,journal:BookOpen,skills:WandSparkles,combat:Shield,messages:MessageSquare};
export default function CommandLinks({game}){
 const items=resolveNavigation(game).filter(item=>!['/','/studio','/settings','/account'].includes(item.route));
 if(!items.length)return null;
 return <section className="mb-4 rounded-lg border border-white/10 bg-runtime-surface p-4"><div className="mb-3"><h2 className="text-sm font-semibold">Command modules</h2><p className="text-xs text-slate-500">Open the tools enabled for this game.</p></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{items.map(item=>{const Icon=icons[item.module]||Map;return <Link key={item.route} to={item.route} className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[.025] p-3 text-sm hover:border-runtime-accent/40 hover:bg-runtime-accent/5"><Icon size={16} className="text-runtime-accent"/><span>{item.label}</span></Link>})}</div></section>;
}