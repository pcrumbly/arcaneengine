import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { resolveNavigation, resolveTheme } from '@/lib/runtimeManifest';

export default function useRuntimeManifest() {
  const [state,setState] = useState(null);
  useEffect(() => {
    const load = () => Promise.all([base44.functions.invoke('runtimeCommand',{command:'GET_STATE'}),base44.functions.invoke('runtimeCommand',{command:'GET_PRESENTATION'})]).then(([runtime,presentation]) => setState({...runtime.data,...presentation.data}));
    const update = event => setState(current=>({...event.detail,locale:current?.locale,locales:current?.locales,translations:current?.translations}));
    load();
    window.addEventListener('runtime-state-updated',update);
    return () => window.removeEventListener('runtime-state-updated',update);
  },[]);
  return useMemo(() => {
    const game = state?.game || state?.games?.find(item => item.id === state?.character?.game_id) || state?.games?.[0] || null;
    return { state, game, navigation:resolveNavigation(game,state?.translations), theme:resolveTheme(game) };
  },[state]);
}