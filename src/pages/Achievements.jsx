import { useEffect,useMemo,useState } from 'react';
import { Link } from 'react-router-dom';
import { invokeRuntimeCommand } from '@/lib/runtimeCommandClient';
import AchievementCard from '@/components/achievements/AchievementCard';
import AchievementControls from '@/components/achievements/AchievementControls';
import AchievementSummary from '@/components/achievements/AchievementSummary';
import PageAlert from '@/components/runtime/PageAlert';
import PageLayout from '@/components/runtime/PageLayout';
import PageState from '@/components/runtime/PageState';
export default function Achievements(){
 const [data,setData]=useState(null),[characters,setCharacters]=useState([]),[filter,setFilter]=useState('all'),[busy,setBusy]=useState(false),[claimingId,setClaimingId]=useState(''),[error,setError]=useState(''),[empty,setEmpty]=useState(false),[reload,setReload]=useState(0);
 const load=async characterId=>{setBusy(true);setError('');try{const {data:result}=await invokeRuntimeCommand({command:'GET_ACHIEVEMENTS',characterId});setData(result)}catch(caught){setError(caught.response?.data?.error||caught.message)}finally{setBusy(false)}};
 useEffect(()=>{setError('');invokeRuntimeCommand({command:'GET_STATE'}).then(({data:state})=>{setCharacters(state.characters||[]);if(!state.character){setEmpty(true);return}load(state.character.id)}).catch(caught=>setError(caught.response?.data?.error||caught.message))},[reload]);
 const rows=useMemo(()=>(data?.achievements||[]).filter(row=>{const complete=Boolean(row.progress.completed_at),claimed=Boolean(row.progress.claimed_at),rewarded=row.reward_labels.length>0;if(filter==='active')return !complete;if(filter==='complete')return complete;if(filter==='claimable')return complete&&rewarded&&!claimed;if(filter==='claimed')return claimed;return true}),[data,filter]);
 const claim=async progress=>{setClaimingId(progress.id);setError('');try{const {data:result}=await invokeRuntimeCommand({command:'CLAIM_ACHIEVEMENT_REWARD',characterId:data.character.id,progressId:progress.id,progressVersion:progress.version,requestId:crypto.randomUUID()});setData(result)}catch(caught){setError(caught.response?.data?.error||caught.message)}finally{setClaimingId('')}};
 if(empty)return <PageState kind="empty" title="Create a character first" description="Achievements track the progress of an active character." action={<Link to="/" className="rounded bg-runtime-accent px-3 py-2 text-sm font-semibold text-slate-950">Open Command Center</Link>}/>;
 if(!data&&error)return <PageState kind="error" title="Unable to load achievements" description={error} action={<button onClick={()=>setReload(value=>value+1)} className="rounded bg-runtime-accent px-3 py-2 text-sm font-semibold text-slate-950">Try again</button>}/>;
 if(!data)return <PageState title="Loading achievements" description="Calculating progress and available rewards."/>;
 return <PageLayout eyebrow="Character / Progress" title="Achievements" description="Complete creator-defined goals, earn points, and claim rewards.">{error&&<div className="mb-4"><PageAlert message={error}/></div>}<AchievementSummary summary={data.summary}/><div className="mt-5"><AchievementControls filter={filter} onFilterChange={setFilter} characters={characters} characterId={data.character.id} onCharacterChange={load} onRefresh={()=>load(data.character.id)} busy={busy||Boolean(claimingId)}/></div><div className="mt-4 grid gap-3 xl:grid-cols-2">{rows.map(row=><AchievementCard key={row.progress.id} row={row} busy={claimingId===row.progress.id} claimsDisabled={Boolean(claimingId)} onClaim={claim}/>)}</div>{!rows.length&&<div className="mt-4 rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No achievements in this view.</div>}</PageLayout>;
}