import { Plus } from 'lucide-react';
import DialogueNodeEditor from '@/components/studio/DialogueNodeEditor';

export default function DialogueGraphEditor({ value, onChange }) {
  const nodes = Array.isArray(value) ? value : [];
  const update = (index, next) => onChange(nodes.map((node, current) => current === index ? next : node));
  return <div className="space-y-3 xl:col-span-2"><div><p className="text-sm text-slate-300">Dialogue tree</p><p className="text-xs text-slate-600">Create conversation nodes, branching choices, effects, and quest events.</p></div><div className="space-y-3">{nodes.map((node, index) => <DialogueNodeEditor key={`${node.key}-${index}`} node={node} nodeKeys={nodes.map(item => item.key).filter(Boolean)} onChange={next => update(index, next)} onRemove={() => onChange(nodes.filter((_, current) => current !== index))}/>)}</div><button type="button" onClick={() => onChange([...nodes, { key: `node-${nodes.length + 1}`, type: 'text', text: 'New dialogue line', options: [] }])} className="flex items-center gap-1 text-sm text-runtime-accent"><Plus size={14}/>Add dialogue node</button></div>;
}