import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoaderCircle } from 'lucide-react';
import InventoryStackActions from '@/components/inventory/InventoryStackActions';
import ItemComparison from '@/components/inventory/ItemComparison';
import ItemCapabilities from '@/components/inventory/ItemCapabilities';
import ItemRequirements from '@/components/inventory/ItemRequirements';
import ItemHistory from '@/components/inventory/ItemHistory';
import ItemProperties from '@/components/inventory/ItemProperties';

export default function ItemDetailsDialog({ item, items, containers, busy, onClose, onAction }) {
  if (!item) return null;
  const definition = item.definition, requirementsMet = item.requirements_met !== false && item.container?.owner_type !== 'party';
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="border-white/10 bg-[#0a1728] text-slate-100 sm:max-w-lg"><DialogHeader><DialogTitle>{definition.name}</DialogTitle><DialogDescription className="text-slate-400">{definition.description}</DialogDescription></DialogHeader>
    <dl className="grid grid-cols-2 gap-3 rounded-md border border-white/10 p-3 text-sm"><Stat label="Category" value={definition.category}/><Stat label="Quantity" value={item.quantity}/><Stat label="Weight" value={definition.weight || 0}/><Stat label="Value" value={definition.value || 0}/><Stat label="Quality" value={item.quality}/><Stat label="Container" value={item.container?.name || 'Unknown'}/></dl>
    <ItemProperties item={item}/>
    <ItemComparison item={item} items={items}/>
    <ItemRequirements item={item}/>
    {!!definition.modifiers?.length && <div><p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Modifiers</p>{definition.modifiers.map((modifier, index) => <p key={index} className="text-sm text-emerald-300">{modifier.attributeId}: {modifier.amount > 0 ? '+' : ''}{modifier.amount}</p>)}</div>}
    <ItemCapabilities item={item}/>
    <InventoryStackActions item={item} items={items} containers={containers} busy={busy} onAction={onAction}/>
    <ItemHistory events={item.history}/>
    <div className="flex flex-wrap justify-end gap-2">{item.equipped_slot && <Action busy={busy} onClick={() => onAction('UNEQUIP_ITEM')}>Unequip</Action>}{!item.equipped_slot && definition.equipment_slots?.map((slot) => <Action key={slot} busy={busy} blocked={!requirementsMet} onClick={() => onAction('EQUIP_ITEM', {slot})}>Equip: {slot}</Action>)}{definition.actions?.includes('use') && <Action primary busy={busy} blocked={!requirementsMet} onClick={() => onAction('USE_ITEM')}>Use item</Action>}</div>
  </DialogContent></Dialog>;
}
function Stat({label,value}) { return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 capitalize">{value}</dd></div>; }
function Action({children,onClick,busy,blocked,primary}) { return <button disabled={busy||blocked} title={blocked?'Requirements not met':undefined} onClick={onClick} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${primary ? 'bg-cyan-400 text-slate-950' : 'border border-white/10'}`}>{busy && <LoaderCircle className="animate-spin" size={14}/>} {children}</button>; }