import { useState } from 'react';

function modifierMap(item){return Object.fromEntries((item?.definition?.modifiers||[]).map(modifier=>[modifier.attributeId,Number(modifier.amount||0)]));}

export default function ItemComparison({item,items}){
  const slots=item.definition.equipment_slots||[];
  const choices=items.filter(candidate=>candidate.id!==item.id&&(candidate.definition.category===item.definition.category||(candidate.definition.equipment_slots||[]).some(slot=>slots.includes(slot))));
  const defaultChoice=choices.find(candidate=>candidate.equipped_slot&&slots.includes(candidate.equipped_slot))||choices[0];
  const [comparisonId,setComparisonId]=useState(defaultChoice?.id||'');
  const comparison=choices.find(candidate=>candidate.id===comparisonId)||defaultChoice;
  if(!comparison)return null;
  const candidate=modifierMap(item),current=modifierMap(comparison),attributes=[...new Set([...Object.keys(candidate),...Object.keys(current)])];
  return <section className="rounded-md border border-cyan-400/20 bg-cyan-400/5 p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs uppercase tracking-wider text-cyan-300">Compare items</p><label className="flex items-center gap-2 text-xs text-slate-400">Against<select value={comparison.id} onChange={event=>setComparisonId(event.target.value)} className="rounded border border-white/10 bg-runtime-surface px-2 py-1.5 text-sm text-slate-100">{choices.map(choice=><option key={choice.id} value={choice.id}>{choice.definition.name}{choice.equipped_slot?' (equipped)':''}</option>)}</select></label></div><div className="mt-3 grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-2 text-sm"><span className="text-slate-500">Property</span><span className="text-slate-500">Compared</span><span className="text-slate-500">Selected</span><span className="text-slate-500">Change</span><ComparisonRow label="Weight" current={Number(comparison.definition.weight||0)} candidate={Number(item.definition.weight||0)} inverse/>{attributes.map(attribute=><ComparisonRow key={attribute} label={attribute} current={current[attribute]||0} candidate={candidate[attribute]||0} signed/>)}</div></section>;
}

function ComparisonRow({label,current,candidate,signed,inverse}){const delta=candidate-current,better=inverse?delta<0:delta>0;return <><span className="capitalize">{label}</span><span>{signed&&current>0?'+':''}{current}</span><span>{signed&&candidate>0?'+':''}{candidate}</span><span className={delta===0?'text-slate-500':better?'text-emerald-300':'text-red-300'}>{delta>0?'+':''}{delta}</span></>;}