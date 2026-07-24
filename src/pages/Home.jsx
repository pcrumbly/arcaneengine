import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import useRuntime from '@/hooks/useRuntime';
import CharacterStrip from '@/components/runtime/CharacterStrip';
import CharacterSetup from '@/components/runtime/CharacterSetup';
import LocationPanel from '@/components/runtime/LocationPanel';
import ActivityFeed from '@/components/runtime/ActivityFeed';
import NpcInteractionDialog from '@/components/runtime/NpcInteractionDialog';
import PageLayout from '@/components/runtime/PageLayout';
import PageAlert from '@/components/runtime/PageAlert';
import PageState from '@/components/runtime/PageState';
import useNpcInteraction from '@/hooks/useNpcInteraction';
import CommandLinks from '@/components/runtime/CommandLinks';
import ContextualActions from '@/components/runtime/ContextualActions';
import StatefulLocationPanel from '@/components/runtime/StatefulLocationPanel';
import { invokeRuntimeCommand } from '@/lib/runtimeCommandClient';

export default function Home() {
  const { state, busy, error, run } = useRuntime();
  const [pendingExitId,setPendingExitId]=useState(''),[worldBusy,setWorldBusy]=useState(false),[worldError,setWorldError]=useState(''),[worldResult,setWorldResult]=useState(null);
  const npc = useNpcInteraction(() => run({ command: 'GET_STATE', characterId: state.character.id }));
  if (!state) return <PageState title="Loading runtime" description="Preparing your game, character, and current location."/>;
  if (!state.character) return <CharacterSetup games={state.games} busy={busy} error={error} onCreate={({name,gameId}) => run({ command: 'CREATE_CHARACTER', name, gameId, requestId: crypto.randomUUID() })}/>;
  if (!state.location) return <PageState kind="error" title="Location unavailable" description="This character's current location is missing from the published content."/>;
  const selectCharacter = (characterId) => run({ command: 'GET_STATE', characterId });
  const move = async(exit) => {setPendingExitId(exit.id);await run({ command: 'MOVE_TO_LOCATION', characterId: state.character.id, characterVersion: state.character.version, destinationId: exit.to_location_id, requestId: crypto.randomUUID() });setPendingExitId('')};
  const worldCommand=async payload=>{setWorldBusy(true);setWorldError('');try{const {data}=await invokeRuntimeCommand({characterId:state.character.id,requestId:crypto.randomUUID(),...payload});setWorldResult(data.result||null);await run({command:'GET_STATE',characterId:state.character.id})}catch(caught){setWorldError(caught.response?.data?.error||caught.message)}finally{setWorldBusy(false)}};
  const game = state.game || state.games.find((item) => item.id === state.character.game_id);
  return <div>
    <CharacterStrip character={state.character} location={state.location} characters={state.characters} game={game} busy={busy} onSelect={selectCharacter}/>
    <PageLayout eyebrow="Player runtime / Exploration" title="Location command center" description="Review the current location, available routes, nearby contacts, and recent events." actions={<button type="button" disabled={busy||npc.busy} onClick={()=>run({command:'GET_STATE',characterId:state.character.id})} className="flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-sm disabled:opacity-50"><RefreshCw size={15} className={busy?'animate-spin':''}/>Refresh</button>}>
      {(error||worldError) && <div className="mb-4"><PageAlert message={error||worldError}/></div>}
      <CommandLinks game={game}/>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]"><LocationPanel location={state.location} exits={state.exits} npcs={state.npcs || []} busy={busy || npc.busy} pendingExitId={pendingExitId} onMove={move} onNpc={(placementId) => npc.open(state.character, placementId)}/><ActivityFeed events={state.activity || []}/></div>
      <StatefulLocationPanel state={state} result={worldResult} busy={worldBusy} onSearchLocation={()=>worldCommand({command:'SEARCH_LOCATION'})} onSearchFeature={featureInstanceId=>worldCommand({command:'SEARCH_FEATURE',featureInstanceId})} onCraft={recipeId=>worldCommand({command:'CRAFT_RECIPE',recipeId})}/>
      <div className="mt-4"><ContextualActions character={state.character} targetType="location" targetId={state.location.id} onExecuted={()=>run({command:'GET_STATE',characterId:state.character.id})}/></div>
    </PageLayout>
    <NpcInteractionDialog interaction={npc.interaction} dialogue={npc.dialogue} result={npc.result} busy={npc.busy} error={npc.error} onAction={npc.act} onSelect={npc.select} onBack={npc.back} onClose={npc.close}/>
  </div>;
}