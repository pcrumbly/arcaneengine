import { CheckCircle2, XCircle } from 'lucide-react';

const describe=condition=>{
  if(condition.all)return `All: ${condition.all.map(describe).join('; ')}`;
  if(condition.any)return `Any: ${condition.any.map(describe).join('; ')}`;
  if(condition.not)return `Not: ${describe(condition.not)}`;
  if(condition.type==='hasTag')return `Character tag: ${condition.tag}`;
  if(condition.type==='attributeAtLeast')return `${condition.attributeId} at least ${condition.value}`;
  if(condition.type==='resourceAtLeast')return `${condition.resourceId} at least ${condition.value}`;
  if(condition.type==='locationIs')return `Location: ${condition.locationKey||condition.locationId}`;
  if(condition.type==='questState')return `${condition.questKey} is ${condition.state}`;
  if(condition.type==='hasItem')return `${condition.quantity||1} × ${condition.itemKey}`;
  if(condition.type==='hasStatus')return `Status: ${condition.statusKey}`;
  return 'Configured rule comparison';
};

export default function ItemRequirements({item}){
  const requirements=item.definition.requirements;
  if(!requirements||!Object.keys(requirements).length)return null;
  const met=item.requirements_met;
  return <section className={`rounded-md border p-3 ${met?'border-emerald-400/20 bg-emerald-400/5':'border-red-400/20 bg-red-400/5'}`}><p className={`flex items-center gap-2 text-xs uppercase tracking-wider ${met?'text-emerald-300':'text-red-300'}`}>{met?<CheckCircle2 size={14}/>:<XCircle size={14}/>}Requirements {met?'met':'not met'}</p><p className="mt-2 text-sm text-slate-300">{describe(requirements)}</p></section>;
}