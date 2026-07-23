import { AlertCircle } from 'lucide-react';
import useRuntime from '@/hooks/useRuntime';
import CharacterStrip from '@/components/runtime/CharacterStrip';
import CharacterSetup from '@/components/runtime/CharacterSetup';
import LocationPanel from '@/components/runtime/LocationPanel';
import ActivityFeed from '@/components/runtime/ActivityFeed';
import DialogueDialog from '@/components/runtime/DialogueDialog';
import PageHeader from '@/components/runtime/PageHeader';
import useDialogue from '@/hooks/useDialogue';

export default function Home() {
  const { state, busy, error, run } = useRuntime();
  const conversation = useDialogue(() => run({ command: 'GET_STATE', characterId: state.character.id }));
  if (!state) return <div className="grid min-h-[calc(100vh-4rem)] place-items-center text-sm text-slate-400">Loading runtime…</div>;
  if (!state.character) return <CharacterSetup games={state.games} busy={busy} onCreate={({name,gameId}) => run({ command: 'CREATE_CHARACTER', name, gameId, requestId: crypto.randomUUID() })}/>;
  const selectCharacter = (characterId) => run({ command: 'GET_STATE', characterId });
  const move = (exit) => run({ command: 'MOVE_TO_LOCATION', characterId: state.character.id, characterVersion: state.character.version, destinationId: exit.to_location_id, requestId: crypto.randomUUID() });
  const game = state.game || state.games.find((item) => item.id === state.character.game_id);
  return <div>
    <CharacterStrip character={state.character} location={state.location} characters={state.characters} game={game} onSelect={selectCharacter}/>
    <div className="p-4 sm:p-6"><PageHeader eyebrow="Player runtime / Exploration" title="Location command center" description="Review the current location, available routes, nearby contacts, and recent events."/>
      {error && <div role="alert" className="mb-4 flex items-center gap-2 rounded-md border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200"><AlertCircle size={16}/>{error}</div>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]"><LocationPanel location={state.location} exits={state.exits} npcs={state.npcs || []} busy={busy || conversation.busy} onMove={move} onTalk={(placementId) => conversation.start(state.character.id, placementId)}/><ActivityFeed events={state.activity}/></div>
    </div>
    <DialogueDialog dialogue={conversation.dialogue} busy={conversation.busy} error={conversation.error} onSelect={conversation.select} onClose={conversation.close}/>
  </div>;
}