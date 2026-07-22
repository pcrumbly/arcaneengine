import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function useRuntime() {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const run = useCallback(async (payload) => {
    setBusy(true);
    setError('');
    try {
      const response = await base44.functions.invoke('runtimeCommand', payload);
      setState(response.data);
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