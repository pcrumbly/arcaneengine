import { useEffect,useMemo,useState } from 'react';
import { invokeRuntimeCommand } from '@/lib/runtimeCommandClient';
import AchievementCard from '@/components/achievements/AchievementCard';
import AchievementSummary from '@/components/achievements/AchievementSummary';
import PageAlert from '@/components/runtime/PageAlert';
import PageLayout from '@/components/runtime/PageLayout';
import PageState from '@/components/runtime/PageState';
export default function Achievements(){
  const [data,setData]=useState(null),[filter,setFilter]=useState('all'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const load=async()=>{setError('');try{const {data:state}=await invokeRuntimeCommand({command:'GET_STATE'});if(!state.character){setData({character:null,achievements:[],summary:{total:0,completed:0,claimed:0,points:0}});return;}const response=await invokeRuntimeCommand({command:'GET_ACHIEVEMENTS',characterId:state.character.id});setData(response.data)}catch(caught){setError(caught.response?.data?.error||caught.message)}};
  useEffect(()=>{load()},[]);
  const rows=useMemo(()=>data?.achievements.filter(row=>filter==='all'||(filter==='complete'?row.progress.completed_at:!row.progress.completed_at))||[],[data,filter]);
  const claim=async progress=>{setBusy(true);setError('');try{const {data:result}=await invokeRuntimeCommand({command:'CLAIM_ACHIEVEMENT_REWARD',characterId:data.character.id,progressId:progress.id,progressVersion:progress.version,requestId:crypto.randomUUID()});setData(result)}catch(caught){setError(caught.response?.data?.error||caught.message)}finally{setBusy(false)}};
  if(!data)return <PageState title="Loading achievements" description="Calculating progress and available rewards."/>;
  if(!data.character)return <PageState kind="empty" title="Create a character first" description="Achievements track the progress of an active character."/>;
  return <PageLayout eyebrow="Character / Progress" title="Achievements" description="Complete creator-defined goals, earn points, and claim rewards.">{error&&<div className="mb-4"><PageAlert message={error}/></div>}<AchievementSummary summary={data.summary}/><div className="mt-5 flex gap-1 rounded-md border border-white/10 bg-runtime-surface p-1 sm:w-fit">{[['all','All'],['active','In progress'],['complete','Completed']].map(([value,label])=><button key={value} onClick={()=>setFilter(value)} className={`rounded px-3 py-1.5 text-xs ${filter===value?'bg-runtime-accent text-slate-950':'text-slate-400'}`}>{label}</button>)}</div><div className="mt-4 grid gap-3 xl:grid-cols-2">{rows.map(row=><AchievementCard key={row.progress.id} row={row} busy={busy} onClaim={claim}/>)}</div>{!rows.length&&<div className="mt-4 rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No achievements in this view.</div>}</PageLayout>;
}