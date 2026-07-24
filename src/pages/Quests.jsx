import { useEffect,useMemo,useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { invokeRuntimeCommand } from '@/lib/runtimeCommandClient';
import QuestTable from '@/components/quests/QuestTable';
import QuestDialog from '@/components/quests/QuestDialog';
import MissionControls from '@/components/quests/MissionControls';
import PageLayout from '@/components/runtime/PageLayout';
import PageAlert from '@/components/runtime/PageAlert';
import PageState from '@/components/runtime/PageState';
export default function Quests(){
 const [data,setData]=useState(null),[characters,setCharacters]=useState([]),[tab,setTab]=useState('active'),[query,setQuery]=useState(''),[selected,setSelected]=useState(null),[selectedAvailable,setSelectedAvailable]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[empty,setEmpty]=useState(false);
 const invoke=async payload=>{setBusy(true);setError('');try{const {data:next}=await invokeRuntimeCommand(payload);setData(next);setSelected(null);return true}catch(caught){setError(caught.response?.data?.error||caught.message);return false}finally{setBusy(false)}};
 useEffect(()=>{invokeRuntimeCommand({command:'GET_STATE'}).then(({data:state})=>{setCharacters(state.characters||[]);if(!state.character){setEmpty(true);return}invoke({command:'GET_QUESTS',characterId:state.character.id})}).catch(caught=>setError(caught.response?.data?.error||caught.message))},[]);
 const list=useMemo(()=>{const source=tab==='available'?data?.available||[]:(data?.quests||[]).filter(mission=>tab==='all'||mission.state.toLowerCase()===tab);return source.filter(mission=>(mission.definition?.name||mission.name).toLowerCase().includes(query.trim().toLowerCase()))},[data,tab,query]);
 if(empty)return <PageState kind="empty" title="No active operator" description="Create a character from the Command page before accepting missions."/>;
 if(!data&&error)return <PageState kind="error" title="Unable to load missions" description={error}/>;
 if(!data)return <PageState title="Loading missions" description="Resolving availability, objectives, branches, and rewards."/>;
 const choose=mission=>{setSelected(mission);setSelectedAvailable(tab==='available')},changeCharacter=characterId=>invoke({command:'GET_QUESTS',characterId}),action=(command,extra={})=>invoke({command,characterId:data.character.id,questDefinitionId:selectedAvailable?selected.id:undefined,questInstanceId:selectedAvailable?undefined:selected.id,questVersion:selected.version,requestId:crypto.randomUUID(),...extra});
 const refresh=<button type="button" disabled={busy} onClick={()=>invoke({command:'GET_QUESTS',characterId:data.character.id})} className="flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-sm disabled:opacity-50"><RefreshCw size={15} className={busy?'animate-spin':''}/>Refresh</button>;
 return <PageLayout eyebrow="Character / Journal" title="Missions & objectives" description="Track available work, active objectives, decisions, rewards, and completed outcomes." actions={refresh}>{error&&<div className="mb-4"><PageAlert message={error}/></div>}<MissionControls tab={tab} onTabChange={setTab} query={query} onQueryChange={setQuery} characters={characters} characterId={data.character.id} onCharacterChange={changeCharacter} busy={busy}/><div className="mt-3"><QuestTable quests={list} available={tab==='available'} onSelect={choose} emptyText={`No ${tab} missions`}/></div><QuestDialog quest={selected} available={selectedAvailable} busy={busy} onClose={()=>setSelected(null)} onAction={action}/></PageLayout>;
}