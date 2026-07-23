import QuestGraphEditor from '@/components/studio/QuestGraphEditor';
import DialogueGraphEditor from '@/components/studio/DialogueGraphEditor';
export default function ContentField({field,value,onChange}){
  const common={required:field.required,value:value??'',onChange:e=>onChange(e.target.value),className:'mt-1.5 w-full rounded border border-white/10 bg-runtime px-3 py-2 text-sm'};
  if(field.type==='questGraph')return <QuestGraphEditor value={value} onChange={onChange}/>;
  if(field.type==='dialogueGraph')return <DialogueGraphEditor value={value} onChange={onChange}/>;
  if(field.type==='checkbox')return <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={!!value} onChange={e=>onChange(e.target.checked)}/>{field.label}</label>;
  if(field.type==='textarea'||field.type==='json')return <label className="block text-sm text-slate-300">{field.label}<textarea {...common} rows={field.type==='json'?6:3} className={`${common.className} font-mono`}/>{field.type==='json'&&<small className="text-slate-600">JSON object or array</small>}</label>;
  if(field.type==='select')return <label className="block text-sm text-slate-300">{field.label}<select {...common}><option value="">Select…</option>{field.options.map(option=><option key={option}>{option}</option>)}</select></label>;
  return <label className="block text-sm text-slate-300">{field.label}<input {...common} type={field.type==='number'?'number':'text'}/>{field.type==='tags'&&<small className="text-slate-600">Comma-separated</small>}</label>;
}