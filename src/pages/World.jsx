import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { invokeRuntimeCommand } from '@/lib/runtimeCommandClient';
import useRuntime from '@/hooks/useRuntime';
import useNpcInteraction from '@/hooks/useNpcInteraction';
import CharacterStrip from '@/components/runtime/CharacterStrip';
import CharacterSetup from '@/components/runtime/CharacterSetup';
import LocationPanel from '@/components/runtime/LocationPanel';
import NpcInteractionDialog from '@/components/runtime/NpcInteractionDialog';
import WorldDirectory from '@/components/runtime/WorldDirectory';
import PageAlert from '@/components/runtime/PageAlert';
import PageLayout from '@/components/runtime/PageLayout';
import PageState from '@/components/runtime/PageState';
import ContextualActions from '@/components/runtime/ContextualActions';
import WorldEnvironment from '@/components/runtime/WorldEnvironment';

export default function World() {
  const { state, busy, error, run } = useRuntime();
  const [world,setWorld]=useState(null),[worldError,setWorldError]=useState(''),[worldBusy,setWorldBusy]=useState(false),[pendingExitId,setPendingExitId]=useState('');
  const npc=useNpcInteraction(()=>run({command:'GET_STATE',characterId:state.character.id}));
  const loadWorld=useCallback(async characterId=>{setWorldBusy(true);setWorldError('');try{const {data}=await invokeRuntimeCommand({command:'GET_WORLD',characterId});setWorld(data)}catch(caught){setWorld(null);setWorldError(caught.response?.data?.error||caught.message)}finally{setWorldBusy(false)}},[]);
  useEffect(()=>{if(state?.character)loadWorld(state.character.id)},[state?.character?.id,state?.character?.content_version,loadWorld]);
  if(!state)return <PageState title="Loading world" description="Resolving your current location and nearby contacts."/>;
  if(!state.character)return <CharacterSetup games={state.games} busy={busy} error={error} onCreate={({name,gameId})=>run({command:'CREATE_CHARACTER',name,gameId,requestId:crypto.randomUUID()})}/>;
  if(!state.location)return <PageState kind="error" title="Location unavailable" description="This character's current location is missing from the published content."/>;
  const game=state.game||state.games.find(item=>item.id===state.character.game_id);
  const move=async exit=>{setPendingExitId(exit.id);const result=await run({command:'MOVE_TO_LOCATION',characterId:state.character.id,characterVersion:state.character.version,destinationId:exit.to_location_id,requestId:crypto.randomUUID()});setPendingExitId('');if(result)await loadWorld(state.character.id)};
  const refresh=async()=>{await run({command:'GET_STATE',characterId:state.character.id});await loadWorld(state.character.id)};
  const actions=<button type="button" disabled={busy||worldBusy||npc.busy} onClick={refresh} className="flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-sm disabled:opacity-50"><RefreshCw size={15} className={busy||worldBusy?'animate-spin':''}/>Refresh</button>;
  return <div><CharacterStrip character={state.character} location={state.location} characters={state.characters} game={game} busy={busy} onSelect={characterId=>run({command:'GET_STATE',characterId})}/><PageLayout eyebrow="Runtime / World" title="Explore the world" description="Travel between connected locations and interact with nearby people." actions={actions}>{(error||worldError)&&<div className="mb-4"><PageAlert message={error||worldError}/></div>}<div className="grid gap-4"><WorldEnvironment environment={world?.environment}/><LocationPanel location={state.location} exits={state.exits} npcs={state.npcs||[]} busy={busy||npc.busy} pendingExitId={pendingExitId} onMove={move} onNpc={placementId=>npc.open(state.character,placementId)}/><ContextualActions character={state.character} targetType="location" targetId={state.location.id} onExecuted={refresh}/>{world?<WorldDirectory locations={world.locations||[]} connections={world.connections||[]} exits={state.exits} currentLocationId={state.character.current_location_id} busy={busy} pendingExitId={pendingExitId} onMove={move}/>:!worldError&&<div role="status" className="rounded-lg border border-white/10 bg-runtime-surface p-5 text-sm text-slate-500">Loading the world directory…</div>}</div></PageLayout><NpcInteractionDialog interaction={npc.interaction} dialogue={npc.dialogue} result={npc.result} busy={npc.busy} error={npc.error} onAction={npc.act} onSelect={npc.select} onBack={npc.back} onClose={npc.close}/></div>;
}