import { Outlet } from 'react-router-dom';
import useRuntimeShortcuts from '@/hooks/useRuntimeShortcuts';
import useRuntimeManifest from '@/hooks/useRuntimeManifest';
import RuntimeHeader from '@/components/runtime/RuntimeHeader';
import RuntimeNavigation from '@/components/runtime/RuntimeNavigation';
import { RuntimeI18nProvider } from '@/lib/RuntimeI18nContext';
import { useAuth } from '@/lib/AuthContext';

export default function AppShell() {
  useRuntimeShortcuts();
  const {state,game,navigation,theme}=useRuntimeManifest();
  const {user}=useAuth();
  const visibleNavigation=(user?.role==='admin'?navigation:navigation.filter(item=>!item.route.startsWith('/studio'))).map(item=>item.route==='/studio'?{...item,label:'Admin Console'}:item);
  return <RuntimeI18nProvider value={state?.translations||{}}><div className="runtime-themed min-h-screen bg-runtime text-runtime-text" style={theme}>
    <RuntimeHeader state={state} game={game}/>
    <div className="mx-auto flex max-w-[1600px]">
      <RuntimeNavigation items={visibleNavigation}/>
      <main className="min-w-0 flex-1 pb-16 md:pb-0"><Outlet/></main>
    </div>
  </div></RuntimeI18nProvider>;
}