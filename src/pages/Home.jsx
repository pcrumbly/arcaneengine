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

export default function Home() {
  const { state, busy, error, run } = useRuntime();
  const npc = useNpcInteraction(() => run({ command: 'GET_STATE', characterId: state.character.id }));
  if (!state) return <PageState title="Loading runtime" description="Preparing your game, character, and current location."/>;
  if (!state.character) return <CharacterSetup games={state.games} busy={busy} onCreate={({name,gameId}) => run({ command: 'CREATE_CHARACTER', name, gameId, requestId: crypto.randomUUID() })}/>;
  const selectCharacter = (characterId) => run({ command: 'GET_STATE', characterId });
  const move = (exit) => run({ command: 'MOVE_TO_LOCATION', characterId: state.character.id, characterVersion: state.character.version, destinationId: exit.to_location_id, requestId: crypto.randomUUID() });
  const game = state.game || state.games.find((item) => item.id === state.character.game_id);
  return <div>
    <CharacterStrip character={state.character} location={state.location} characters={state.characters} game={game} onSelect={selectCharacter}/>
    <PageLayout eyebrow="Player runtime / Exploration" title="Location command center" description="Review the current location, available routes, nearby contacts, and recent events.">
      {error && <div className="mb-4"><PageAlert message={error}/></div>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]"><LocationPanel location={state.location} exits={state.exits} npcs={state.npcs || []} busy={busy || npc.busy} onMove={move} onNpc={(placementId) => npc.open(state.character, placementId)}/><ActivityFeed events={state.activity}/></div>
    </PageLayout>
    <NpcInteractionDialog interaction={npc.interaction} dialogue={npc.dialogue} busy={npc.busy} error={npc.error} onAction={npc.act} onSelect={npc.select} onBack={npc.back} onClose={npc.close}/>
  </div>;
}