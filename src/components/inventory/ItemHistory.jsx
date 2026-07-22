import { History } from 'lucide-react';

const labels={EQUIP_ITEM:'Equipped',UNEQUIP_ITEM:'Unequipped',TRANSFER_ITEM:'Moved',BULK_TRANSFER_ITEMS:'Moved in bulk',SPLIT_ITEM:'Stack split',MERGE_ITEM:'Stacks merged'};

export default function ItemHistory({events}){
  if(!events?.length)return null;
  return <section><p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500"><History size={13}/>History</p><ol className="space-y-2">{events.map(event=><li key={event.id} className="flex items-start justify-between gap-3 rounded border border-white/10 px-3 py-2 text-sm"><div><p>{labels[event.command]||event.command.toLowerCase().replaceAll('_',' ')}</p><p className="mt-0.5 text-xs text-slate-500">Request {event.request_id.slice(0,8)}</p></div><time className="shrink-0 text-xs text-slate-400" dateTime={event.occurred_at}>{new Date(event.occurred_at).toLocaleString()}</time></li>)}</ol></section>;
}