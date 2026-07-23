import { useCallback, useEffect, useState } from 'react';
import { invokeRuntimeCommand } from '@/lib/runtimeCommandClient';

export default function useRuntime() {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const run = useCallback(async (payload) => {
    setBusy(true);
    setError('');
    try {
      const response = await invokeRuntimeCommand(payload);
      setState(response.data);
      window.dispatchEvent(new CustomEvent('runtime-state-updated',{detail:response.data}));
      return response.data;
    } catch (caught) {
      setError(caught.response?.data?.error || caught.message);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => { run({ command: 'GET_STATE' }); }, [run]);
  return { state, busy, error, run };
}