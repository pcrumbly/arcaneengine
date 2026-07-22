import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoaderCircle } from 'lucide-react';
import InventoryStackActions from '@/components/inventory/InventoryStackActions';
import ItemComparison from '@/components/inventory/ItemComparison';

export default function ItemDetailsDialog({ item, items, containers, busy, onClose, onAction }) {
  if (!item) return null;
  const definition = item.definition;
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="border-white/10 bg-[#0a1728] text-slate-100 sm:max-w-lg"><DialogHeader><DialogTitle>{definition.name}</DialogTitle><DialogDescription className="text-slate-400">{definition.description}</DialogDescription></DialogHeader>
    <dl className="grid grid-cols-2 gap-3 rounded-md border border-white/10 p-3 text-sm"><Stat label="Category" value={definition.category}/><Stat label="Quantity" value={item.quantity}/><Stat label="Weight" value={definition.weight || 0}/><Stat label="Value" value={definition.value || 0}/><Stat label="Quality" value={item.quality}/><Stat label="Container" value={item.container?.name || 'Unknown'}/></dl>
    <ItemComparison item={item} items={items}/>
    {!!definition.modifiers?.length && <div><p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Modifiers</p>{definition.modifiers.map((modifier, index) => <p key={index} className="text-sm text-emerald-300">{modifier.attributeId}: {modifier.amount > 0 ? '+' : ''}{modifier.amount}</p>)}</div>}
    <InventoryStackActions item={item} items={items} containers={containers} busy={busy} onAction={onAction}/>
    <div className="flex flex-wrap justify-end gap-2">{item.equipped_slot && <Action busy={busy} onClick={() => onAction('UNEQUIP_ITEM')}>Unequip</Action>}{!item.equipped_slot && definition.equipment_slots?.map((slot) => <Action key={slot} busy={busy} onClick={() => onAction('EQUIP_ITEM', {slot})}>Equip: {slot}</Action>)}{definition.actions?.includes('use') && <Action primary busy={busy} onClick={() => onAction('USE_ITEM')}>Use item</Action>}</div>
  </DialogContent></Dialog>;
}
function Stat({label,value}) { return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 capitalize">{value}</dd></div>; }
function Action({children,onClick,busy,primary}) { return <button disabled={busy} onClick={onClick} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${primary ? 'bg-cyan-400 text-slate-950' : 'border border-white/10'}`}>{busy && <LoaderCircle className="animate-spin" size={14}/>} {children}</button>; }