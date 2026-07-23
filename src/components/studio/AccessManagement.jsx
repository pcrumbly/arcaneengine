import { useEffect,useState } from 'react';
import { invokeRuntimeCommand } from '@/lib/runtimeCommandClient';
import PageAlert from '@/components/runtime/PageAlert';

export default function AccessManagement(){
  const [users,setUsers]=useState([]),[email,setEmail]=useState(''),[role,setRole]=useState('user'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const run=async payload=>{setBusy(true);setError('');try{const {data}=await invokeRuntimeCommand(payload);setUsers(data.users||[]);setEmail('')}catch(caught){setError(caught.response?.data?.error||caught.message)}finally{setBusy(false)}};
  useEffect(()=>{run({command:'GET_ADMIN_USERS'})},[]);
  return <section className="rounded-lg border border-white/10 bg-runtime-surface">
    <div className="border-b border-white/10 p-4"><h2 className="font-semibold">User access</h2><p className="mt-1 text-xs text-slate-500">Invite registered participants and assign platform administrator or regular user access.</p></div>
    <form onSubmit={event=>{event.preventDefault();run({command:'INVITE_USER',email,role})}} className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-[1fr_160px_auto]">
      <input required type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="Email address" className="rounded border border-white/10 bg-runtime px-3 py-2 text-sm"/>
      <select value={role} onChange={event=>setRole(event.target.value)} className="rounded border border-white/10 bg-runtime px-3 py-2 text-sm"><option value="user">Regular user</option><option value="admin">Administrator</option></select>
      <button disabled={busy} className="rounded bg-runtime-accent px-4 py-2 text-sm font-semibold text-slate-950">Send invite</button>
    </form>
    {error&&<div className="p-4"><PageAlert message={error}/></div>}
    <div className="divide-y divide-white/5">{users.map(user=><div key={user.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_220px] sm:items-center"><div><p className="text-sm font-medium">{user.full_name||'Invited user'}</p><p className="text-xs text-slate-500">{user.email}</p></div><select value={user.role||'user'} disabled={busy} onChange={event=>run({command:'UPDATE_USER_ROLE',userId:user.id,role:event.target.value})} className="rounded border border-white/10 bg-runtime px-3 py-2 text-sm"><option value="user">Regular user</option><option value="admin">Administrator</option></select></div>)}</div>
  </section>;
}