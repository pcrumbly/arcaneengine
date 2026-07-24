import { Plus } from 'lucide-react';
import NpcInteractionCard from '@/components/studio/NpcInteractionCard';
import SynchronizedJsonEditor from '@/components/studio/SynchronizedJsonEditor';
export default function NpcInteractionsEditor({value,onChange,references}){
 const actions=Array.isArray(value)?value:[],update=(index,next)=>onChange(actions.map((action,current)=>current===index?next:action));
 const visual=<div className="space-y-3"><div><p className="text-sm text-slate-300">NPC interactions</p><p className="text-xs text-slate-600">Connect conversations, inspection actions, shops, healing, and training.</p></div>{actions.map((action,index)=><NpcInteractionCard key={`${action.key}-${index}`} action={action} references={references} onChange={next=>update(index,next)} onRemove={()=>onChange(actions.filter((_,current)=>current!==index))}/>)}<button type="button" onClick={()=>onChange([...actions,{key:`action-${actions.length+1}`,label:'New interaction',type:'talk',description:'',conditions:{},effects:[]}])} className="flex items-center gap-1 text-sm text-runtime-accent"><Plus size={14}/>Add interaction</button></div>;
 return <SynchronizedJsonEditor label="Interactions" value={actions} emptyValue={[]} onChange={onChange}>{visual}</SynchronizedJsonEditor>;
}