export default function ItemProperties({item}){
  const custom=Object.entries(item.custom_properties||{}),modifications=item.applied_modifications||[];
  if(item.durability==null&&!item.bound_state&&!item.acquired_at&&!custom.length&&!modifications.length)return null;
  return <section><p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Instance properties</p><dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">{item.durability!=null&&<Property label="Durability" value={item.durability}/>}<Property label="Bound" value={item.bound_state||'unbound'}/>{item.acquired_at&&<Property label="Acquired" value={new Date(item.acquired_at).toLocaleString()}/>}<Property label="Content version" value={item.content_version}/>{custom.map(([key,value])=><Property key={key} label={key} value={format(value)}/>)}</dl>{!!modifications.length&&<div className="mt-3 space-y-1">{modifications.map((value,index)=><div key={index} className="rounded border border-white/10 bg-white/[.025] px-2.5 py-2 font-mono text-xs text-slate-300">{format(value)}</div>)}</div>}</section>;
}

function Property({label,value}){return <div><dt className="text-xs capitalize text-slate-500">{label.replaceAll('_',' ')}</dt><dd className="mt-0.5 break-words capitalize text-slate-200">{String(value??'—')}</dd></div>;}
function format(value){return typeof value==='object'?JSON.stringify(value):String(value);}