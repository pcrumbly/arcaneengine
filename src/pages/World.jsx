import { useEffect, useState } from 'react';
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

export default function World() {
  const { state, busy, error, run } = useRuntime();
  const [world, setWorld] = useState(null), [worldError, setWorldError] = useState('');
  const npc = useNpcInteraction(() => run({ command: 'GET_STATE', characterId: state.character.id }));
  useEffect(() => {
    if (!state?.character) return;
    setWorld(null); setWorldError('');
    invokeRuntimeCommand({ command: 'GET_WORLD' }).then(({ data }) => setWorld(data)).catch(caught => setWorldError(caught.response?.data?.error || caught.message));
  }, [state?.character?.game_id, state?.character?.content_version]);
  if (!state) return <PageState title="Loading world" description="Resolving your current location and nearby contacts."/>;
  if (!state.character) return <CharacterSetup games={state.games} busy={busy} onCreate={({ name, gameId }) => run({ command: 'CREATE_CHARACTER', name, gameId, requestId: crypto.randomUUID() })}/>;
  const game = state.game || state.games.find(item => item.id === state.character.game_id);
  const move = exit => run({ command: 'MOVE_TO_LOCATION', characterId: state.character.id, characterVersion: state.character.version, destinationId: exit.to_location_id, requestId: crypto.randomUUID() });
  return <div><CharacterStrip character={state.character} location={state.location} characters={state.characters} game={game} onSelect={characterId => run({ command: 'GET_STATE', characterId })}/><PageLayout eyebrow="Runtime / World" title="Explore the world" description="Travel between connected locations and interact with nearby people.">{(error || worldError) && <div className="mb-4"><PageAlert message={error || worldError}/></div>}<div className="grid gap-4"><LocationPanel location={state.location} exits={state.exits} npcs={state.npcs || []} busy={busy || npc.busy} onMove={move} onNpc={placementId => npc.open(state.character, placementId)}/>{world ? <WorldDirectory locations={world.locations} exits={state.exits} currentLocationId={state.character.current_location_id} busy={busy} onMove={move}/> : !worldError && <div className="rounded-lg border border-white/10 bg-runtime-surface p-5 text-sm text-slate-500">Loading the world directory…</div>}</div></PageLayout><NpcInteractionDialog interaction={npc.interaction} dialogue={npc.dialogue} busy={npc.busy} error={npc.error} onAction={npc.act} onSelect={npc.select} onBack={npc.back} onClose={npc.close}/></div>;
}