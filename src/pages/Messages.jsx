import { useEffect,useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { invokeRuntimeCommand } from '@/lib/runtimeCommandClient';
import MessageItem from '@/components/messages/MessageItem';
import PageLayout from '@/components/runtime/PageLayout';
import PageAlert from '@/components/runtime/PageAlert';
import PageState from '@/components/runtime/PageState';
export default function Messages(){
 const navigate=useNavigate(),[data,setData]=useState(null),[busyId,setBusyId]=useState(''),[refreshing,setRefreshing]=useState(false),[error,setError]=useState('');
 const load=async(silent=false)=>{if(!silent)setRefreshing(true);try{const {data:next}=await invokeRuntimeCommand({command:'GET_NOTIFICATIONS'});setData(next);setError('')}catch(caught){if(!silent)setError(caught.response?.data?.error||caught.message)}finally{if(!silent)setRefreshing(false)}};
 useEffect(()=>{load();const refresh=()=>load(true),timer=setInterval(refresh,30000);window.addEventListener('notifications:changed',refresh);return()=>{clearInterval(timer);window.removeEventListener('notifications:changed',refresh)}},[]);
 const open=async item=>{setBusyId(item.id);setError('');try{if(!item.read){const {data:next}=await invokeRuntimeCommand({command:'MARK_NOTIFICATION_READ',notificationId:item.id});setData(next);window.dispatchEvent(new Event('notifications:changed'))}if(item.link?.startsWith('/'))navigate(item.link)}catch(caught){setError(caught.response?.data?.error||caught.message)}finally{setBusyId('')}};
 if(!data&&error)return <PageState kind="error" title="Unable to load messages" description={error} action={<button onClick={()=>load()} className="rounded bg-runtime-accent px-3 py-2 text-sm font-semibold text-slate-950">Try again</button>}/>;
 if(!data)return <PageState title="Loading messages" description="Opening your system and game inbox."/>;
 const refreshButton=<button type="button" disabled={refreshing||Boolean(busyId)} onClick={()=>load()} className="flex items-center gap-2 rounded border border-white/10 px-3 py-2 text-sm disabled:opacity-50"><RefreshCw size={15} className={refreshing?'animate-spin':''}/>Refresh</button>;
 return <PageLayout eyebrow="Account / Inbox" title="Messages" description={`${data.unread} unread message${data.unread===1?'':'s'}.`} actions={refreshButton}>{error&&<div className="mb-4"><PageAlert message={error}/></div>}<div className="divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10 bg-runtime-surface">{data.notifications.map(item=><MessageItem key={item.id} item={item} busy={busyId===item.id} onOpen={open}/>)}{!data.notifications.length&&<div className="p-8 text-center"><h3 className="font-semibold">Inbox clear</h3><p className="mt-2 text-sm text-slate-500">System and game messages will appear here.</p></div>}</div></PageLayout>;
}