import QuestGraphEditor from '@/components/studio/QuestGraphEditor';
import DialogueGraphEditor from '@/components/studio/DialogueGraphEditor';
import ContentReferenceField from '@/components/studio/ContentReferenceField';
import RewardEditor from '@/components/studio/RewardEditor';
import NpcInteractionsEditor from '@/components/studio/NpcInteractionsEditor';
import SynchronizedJsonEditor from '@/components/studio/SynchronizedJsonEditor';
export default function ContentField({field,value,onChange,references={},allValues={}}){
  const common={required:field.required,value:value??'',onChange:e=>onChange(e.target.value),className:'mt-1.5 w-full rounded border border-white/10 bg-runtime px-3 py-2 text-sm'};
  if(field.type==='questGraph')return <QuestGraphEditor value={value} onChange={onChange}/>;
  if(field.type==='dialogueGraph')return <SynchronizedJsonEditor label="Dialogue nodes" value={value||[]} emptyValue={[]} onChange={onChange}><DialogueGraphEditor value={value} onChange={onChange}/></SynchronizedJsonEditor>;
  if(field.type==='dialogueStart')return <label className="block text-sm text-slate-300">{field.label}<select {...common}><option value="">Select starting node…</option>{(allValues.nodes||[]).map(node=><option key={node.key} value={node.key}>{node.text?.slice(0,60)||node.key} · {node.key}</option>)}</select></label>;
  if(field.type==='npcInteractions')return <NpcInteractionsEditor value={value} onChange={onChange} references={references}/>;
  if(field.type==='reference'||field.type==='references')return <ContentReferenceField field={field} value={value} onChange={onChange} options={references[field.referenceType]||[]}/>;
  if(field.type==='rewards')return <RewardEditor value={value} onChange={onChange} items={references.ItemDefinition||[]} mode={field.rewardMode}/>;
  if(field.type==='checkbox')return <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={!!value} onChange={e=>onChange(e.target.checked)}/>{field.label}</label>;
  if(field.type==='textarea'||field.type==='json')return <label className="block text-sm text-slate-300">{field.label}<textarea {...common} rows={field.type==='json'?6:3} className={`${common.className} font-mono`}/>{field.type==='json'&&<small className="text-slate-600">Advanced JSON</small>}</label>;
  if(field.type==='select')return <label className="block text-sm text-slate-300">{field.label}<select {...common}><option value="">Select…</option>{field.options.map(option=><option key={option}>{option}</option>)}</select></label>;
  return <label className="block text-sm text-slate-300">{field.label}<input {...common} type={field.type==='number'?'number':'text'}/>{field.type==='tags'&&<small className="text-slate-600">Comma-separated</small>}</label>;
}