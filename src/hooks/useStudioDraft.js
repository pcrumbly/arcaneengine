import { useEffect, useMemo, useState } from 'react';

const snapshot = value => JSON.parse(JSON.stringify(value || {}));
const signature = value => JSON.stringify(value || {});

export default function useStudioDraft(initialValue = {}) {
  const initial = snapshot(initialValue);
  const [history, setHistory] = useState([initial]);
  const [index, setIndex] = useState(0);
  const [baseline, setBaseline] = useState(initial);
  const value = history[index] || {};
  const dirty = useMemo(() => signature(value) !== signature(baseline), [value, baseline]);
  const reset = nextValue => {
    const next = snapshot(nextValue);
    setHistory([next]);
    setIndex(0);
    setBaseline(next);
  };
  const update = nextValue => {
    const next = snapshot(typeof nextValue === 'function' ? nextValue(value) : nextValue);
    if (signature(next) === signature(value)) return;
    setHistory(current => [...current.slice(0, index + 1), next]);
    setIndex(current => current + 1);
  };
  const undo = () => setIndex(current => Math.max(0, current - 1));
  const redo = () => setIndex(current => Math.min(history.length - 1, current + 1));
  const canLeave = () => !dirty || window.confirm('Discard your unsaved content changes?');
  useEffect(() => {
    const warn = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  return { value, dirty, reset, update, undo, redo, canUndo: index > 0, canRedo: index < history.length - 1, canLeave };
}