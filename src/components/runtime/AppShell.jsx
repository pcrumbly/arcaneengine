import { Outlet } from 'react-router-dom';
import useRuntimeShortcuts from '@/hooks/useRuntimeShortcuts';
import useRuntimeManifest from '@/hooks/useRuntimeManifest';
import RuntimeHeader from '@/components/runtime/RuntimeHeader';
import RuntimeNavigation from '@/components/runtime/RuntimeNavigation';

export default function AppShell() {
  useRuntimeShortcuts();
  const {state,game,navigation,theme}=useRuntimeManifest();
  return <div className="runtime-themed min-h-screen bg-runtime text-runtime-text" style={theme}>
    <RuntimeHeader state={state} game={game}/>
    <div className="mx-auto flex max-w-[1600px]">
      <RuntimeNavigation items={navigation}/>
      <main className="min-w-0 flex-1 pb-16 md:pb-0"><Outlet/></main>
    </div>
  </div>;
}