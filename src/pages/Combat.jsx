import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import CombatRoster from '@/components/combat/CombatRoster';
import CombatActions from '@/components/combat/CombatActions';
import CombatLog from '@/components/combat/CombatLog';
import EncounterList from '@/components/combat/EncounterList';
import PageLayout from '@/components/runtime/PageLayout';
import PageAlert from '@/components/runtime/PageAlert';
import PageState from '@/components/runtime/PageState';

export default function Combat() {
  const [data,setData] = useState(null), [targetId,setTargetId] = useState(''), [busy,setBusy] = useState(false), [error,setError] = useState('');
  const invoke = async (payload) => { setBusy(true); setError(''); try { const {data:next} = await base44.functions.invoke('runtimeCommand', payload); setData(next); const target = next.participants?.find((item) => item.team !== 'player' && item.status === 'active'); setTargetId(target?.id || ''); } catch (caught) { setError(caught.response?.data?.error || caught.message); } finally { setBusy(false); } };
  useEffect(() => { base44.functions.invoke('runtimeCommand', { command:'GET_STATE' }).then(({data:state}) => state.character && invoke({ command:'GET_COMBAT', characterId:state.character.id })); }, []);
  const actor = useMemo(() => data?.participants?.find((item) => item.id === data.combat?.active_participant_id), [data]);
  if (!data) return <PageState title="Loading combat state" description="Synchronizing participants, turn order, abilities, and combat events."/>;
  const start = (encounterDefinitionId) => invoke({ command:'START_ENCOUNTER', characterId:data.character.id, encounterDefinitionId, requestId:crypto.randomUUID() });
  const submit = (abilityId) => invoke({ command:'SELECT_COMBAT_ACTION', characterId:data.character.id, combatId:data.combat.id, combatVersion:data.combat.version, targetParticipantId:targetId, abilityId, requestId:crypto.randomUUID() });
  const close = () => invoke({ command:'COMPLETE_COMBAT', characterId:data.character.id, combatId:data.combat.id, requestId:crypto.randomUUID() });
  const combatStatus = data.combat ? <span className="rounded-md border border-white/10 bg-runtime-surface px-3 py-2 text-sm text-slate-300">Round {data.combat.round} · {data.combat.state.replaceAll('_',' ')}</span> : null;
  return <PageLayout eyebrow="Runtime / Tactical resolution" title="Combat" description="Server-resolved actions with deterministic replay data." actions={combatStatus}>{error && <div className="mt-4"><PageAlert message={error}/></div>}
    {!data.combat ? <div className="mt-6"><EncounterList encounters={data.encounters} busy={busy} onStart={start}/></div> : <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_320px]"><div className="space-y-4"><CombatRoster participants={data.participants} selectedId={targetId} onSelect={setTargetId}/>{data.combat.state === 'AWAITING_ACTIONS' ? <CombatActions abilities={data.abilities} actor={actor} targetId={targetId} busy={busy} onSubmit={submit}/> : <button onClick={close} disabled={busy} className="rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">Close combat</button>}</div><CombatLog events={data.events} participants={data.participants} abilities={data.abilities}/></div>}
  </PageLayout>;
}