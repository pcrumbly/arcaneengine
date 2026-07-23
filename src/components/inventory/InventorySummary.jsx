import { PackageCheck, Scale, ShieldCheck, Sparkles } from 'lucide-react';

export default function InventorySummary({ summary }) {
  const entries = [
    { label: 'Member load', value: `${summary.weight} / ${summary.capacity}`, icon: Scale },
    { label: 'Capacity used', value: `${summary.capacity ? Math.round(summary.weight / summary.capacity * 100) : 0}%`, icon: PackageCheck },
    { label: 'Equipped', value: summary.equipped, icon: ShieldCheck },
    { label: 'Party storage', value: summary.shared ? `${summary.shared} · ${summary.sharedWeight} weight` : 0, icon: Sparkles }
  ];
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{entries.map(({label,value,icon:Icon}) => <div key={label} className="rounded-lg border border-white/10 bg-[#0a1728] p-4"><Icon size={16} className="text-cyan-400"/><p className="mt-3 text-xl font-semibold">{value}</p><p className="text-xs text-slate-500">{label}</p></div>)}</div>;
}