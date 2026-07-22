import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import CombatRoster from '@/components/combat/CombatRoster';
import CombatActions from '@/components/combat/CombatActions';
import CombatLog from '@/components/combat/CombatLog';
import EncounterList from '@/components/combat/EncounterList';

export default function Combat() {
  const [data,setData] = useState(null), [targetId,setTargetId] = useState(''), [busy,setBusy] = useState(false), [error,setError] = useState('');
  const invoke = async (payload) => { setBusy(true); setError(''); try { const {data:next} = await base44.functions.invoke('runtimeCommand', payload); setData(next); const target = next.participants?.find((item) => item.team !== 'player' && item.status === 'active'); setTargetId(target?.id || ''); } catch (caught) { setError(caught.response?.data?.error || caught.message); } finally { setBusy(false); } };
  useEffect(() => { base44.functions.invoke('runtimeCommand', { command:'GET_STATE' }).then(({data:state}) => state.character && invoke({ command:'GET_COMBAT', characterId:state.character.id })); }, []);
  const actor = useMemo(() => data?.participants?.find((item) => item.id === data.combat?.active_participant_id), [data]);
  if (!data) return <div className="p-6 text-sm text-slate-400">Loading combat state…</div>;
  const start = (encounterDefinitionId) => invoke({ command:'START_ENCOUNTER', characterId:data.character.id, encounterDefinitionId, requestId:crypto.randomUUID() });
  const submit = (abilityId) => invoke({ command:'SELECT_COMBAT_ACTION', characterId:data.character.id, combatId:data.combat.id, combatVersion:data.combat.version, targetParticipantId:targetId, abilityId, requestId:crypto.randomUUID() });
  const close = () => invoke({ command:'COMPLETE_COMBAT', characterId:data.character.id, combatId:data.combat.id, requestId:crypto.randomUUID() });
  return <div className="p-4 sm:p-6"><p className="text-xs uppercase tracking-[.22em] text-cyan-400">Runtime / Tactical resolution</p><div className="flex items-end justify-between"><div><h2 className="mt-1 text-2xl font-semibold">Combat</h2><p className="mt-1 text-sm text-slate-500">Server-resolved actions with deterministic replay data.</p></div>{data.combat && <span className="text-sm text-slate-400">Round {data.combat.round} · {data.combat.state.replaceAll('_',' ')}</span>}</div>{error && <div role="alert" className="mt-4 rounded-md border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
    {!data.combat ? <div className="mt-6"><EncounterList encounters={data.encounters} busy={busy} onStart={start}/></div> : <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_320px]"><div className="space-y-4"><CombatRoster participants={data.participants} selectedId={targetId} onSelect={setTargetId}/>{data.combat.state === 'AWAITING_ACTIONS' ? <CombatActions abilities={data.abilities} actor={actor} targetId={targetId} busy={busy} onSubmit={submit}/> : <button onClick={close} disabled={busy} className="rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950">Close combat</button>}</div><CombatLog events={data.events} participants={data.participants} abilities={data.abilities}/></div>}
  </div>;
}