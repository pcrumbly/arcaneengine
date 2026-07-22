function modifierMap(item){return Object.fromEntries((item?.definition?.modifiers||[]).map(modifier=>[modifier.attributeId,Number(modifier.amount||0)]));}

export default function ItemComparison({item,items}){
  if(item.equipped_slot)return null;
  const slots=item.definition.equipment_slots||[],equipped=items.find(candidate=>candidate.equipped_slot&&slots.includes(candidate.equipped_slot));
  if(!equipped)return null;
  const candidate=modifierMap(item),current=modifierMap(equipped),attributes=[...new Set([...Object.keys(candidate),...Object.keys(current)])];
  return <section className="rounded-md border border-cyan-400/20 bg-cyan-400/5 p-3"><p className="text-xs uppercase tracking-wider text-cyan-300">Compared with {equipped.definition.name}</p><div className="mt-3 grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-2 text-sm"><span className="text-slate-500">Property</span><span className="text-slate-500">Equipped</span><span className="text-slate-500">Selected</span><span className="text-slate-500">Change</span><ComparisonRow label="Weight" current={Number(equipped.definition.weight||0)} candidate={Number(item.definition.weight||0)}/>{attributes.map(attribute=><ComparisonRow key={attribute} label={attribute} current={current[attribute]||0} candidate={candidate[attribute]||0} signed/>)}</div></section>;
}

function ComparisonRow({label,current,candidate,signed}){const delta=candidate-current;return <><span className="capitalize">{label}</span><span>{signed&&current>0?'+':''}{current}</span><span>{signed&&candidate>0?'+':''}{candidate}</span><span className={delta>0?'text-emerald-300':delta<0?'text-red-300':'text-slate-500'}>{delta>0?'+':''}{delta}</span></>;}