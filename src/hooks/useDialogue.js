import { useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function useDialogue(onResolved) {
  const [dialogue, setDialogue] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const invoke = async (payload) => {
    setBusy(true); setError('');
    try { const { data } = await base44.functions.invoke('runtimeCommand', payload); setDialogue(data.dialogue); if (payload.command === 'SELECT_DIALOGUE_OPTION') await onResolved(); }
    catch (caught) { setError(caught.response?.data?.error || caught.message); }
    finally { setBusy(false); }
  };
  return { dialogue, busy, error, start: (characterId, placementId) => invoke({ command: 'START_DIALOGUE', characterId, placementId, requestId: crypto.randomUUID() }), select: (optionKey) => invoke({ command: 'SELECT_DIALOGUE_OPTION', sessionId: dialogue.session.id, sessionVersion: dialogue.session.version, optionKey, requestId: crypto.randomUUID() }), close: () => { setDialogue(null); setError(''); } };
}