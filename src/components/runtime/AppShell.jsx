import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, PanelsTopLeft, PackageSearch, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const links = [
  { to: '/', label: 'Runtime', icon: LayoutDashboard },
  { to: '/inventory', label: 'Inventory', icon: PackageSearch },
  { to: '/studio', label: 'Game Studio', icon: PanelsTopLeft }
];

export default function AppShell() {
  return <div className="min-h-screen bg-[#07111f] text-slate-100">
    <header className="h-16 border-b border-white/10 bg-[#0a1728] px-4 sm:px-6 flex items-center justify-between">
      <div><p className="text-[10px] uppercase tracking-[.28em] text-cyan-400">Agnostic engine</p><h1 className="font-semibold tracking-tight">RPG Runtime</h1></div>
      <button onClick={() => base44.auth.logout('/login')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"><LogOut size={16}/> Sign out</button>
    </header>
    <div className="mx-auto flex max-w-[1600px]">
      <aside className="hidden md:block w-56 shrink-0 border-r border-white/10 min-h-[calc(100vh-4rem)] p-3">
        <nav className="space-y-1">{links.map(({to,label,icon:Icon}) => <NavLink key={to} to={to} end={to === '/'} className={({isActive}) => `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-cyan-400/10 text-cyan-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Icon size={17}/>{label}</NavLink>)}</nav>
      </aside>
      <main className="min-w-0 flex-1 pb-16 md:pb-0"><Outlet/></main>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-white/10 bg-[#0a1728] md:hidden">{links.map(({to,label,icon:Icon}) => <NavLink key={to} to={to} end={to === '/'} className={({isActive}) => `flex flex-col items-center gap-1 py-2 text-[10px] ${isActive ? 'text-cyan-300' : 'text-slate-500'}`}><Icon size={17}/>{label}</NavLink>)}</nav>
  </div>;
}