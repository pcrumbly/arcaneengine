import { useEffect, useState } from 'react';

export default function JsonValueField({ label, value, emptyValue, onChange }) {
  const [text, setText] = useState(''), [error, setError] = useState('');
  useEffect(() => { setText(JSON.stringify(value ?? emptyValue, null, 2)); setError(''); }, [value]);
  const commit = () => { try { onChange(JSON.parse(text)); setError(''); } catch (caught) { setError(caught.message); } };
  return <label className="block text-xs text-slate-400">{label}<textarea value={text} onChange={event => setText(event.target.value)} onBlur={commit} rows={3} className="mt-1 w-full rounded border border-white/10 bg-runtime-surface px-3 py-2 font-mono text-xs text-slate-300"/>{error && <span className="mt-1 block text-red-300">Invalid JSON: {error}</span>}</label>;
}