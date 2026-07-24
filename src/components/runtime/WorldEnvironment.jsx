import { Clock3, CloudSun, Thermometer } from 'lucide-react';
export default function WorldEnvironment({environment}){
  if(!environment)return null;
  const date=new Date(environment.clock.current_time),weather=environment.weather;
  return <section className="grid gap-3 rounded-lg border border-white/10 bg-runtime-surface p-4 sm:grid-cols-3"><Metric icon={Clock3} label="World time" value={date.toLocaleString([], {dateStyle:'medium',timeStyle:'short',timeZone:'UTC'})}/><Metric icon={CloudSun} label={`${environment.region} · ${environment.clock.phase}`} value={weather?.name||'No weather defined'}/><Metric icon={Thermometer} label="Conditions" value={weather?.temperature===undefined?(weather?.description||'Unspecified'):`${weather.temperature}° · ${weather.description||'Current temperature'}`}/></section>;
}
function Metric({icon:Icon,label,value}){return <div className="rounded-md border border-white/10 bg-white/[.025] px-3 py-2"><p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500"><Icon size={12}/>{label}</p><p className="mt-1 text-sm font-medium capitalize">{value}</p></div>}