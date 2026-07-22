import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { resolveNavigation, resolveTheme } from '@/lib/runtimeManifest';

export default function useRuntimeManifest() {
  const [state,setState] = useState(null);
  useEffect(() => {
    const load = () => base44.functions.invoke('runtimeCommand',{command:'GET_STATE'}).then(({data}) => setState(data));
    const update = event => setState(event.detail);
    load();
    window.addEventListener('runtime-state-updated',update);
    return () => window.removeEventListener('runtime-state-updated',update);
  },[]);
  return useMemo(() => {
    const game = state?.game || state?.games?.find(item => item.id === state?.character?.game_id) || state?.games?.[0] || null;
    return { state, game, navigation:resolveNavigation(game), theme:resolveTheme(game) };
  },[state]);
}