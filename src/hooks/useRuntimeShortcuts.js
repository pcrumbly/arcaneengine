import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const eventBinding = (event) => [event.ctrlKey&&'Ctrl',event.altKey&&'Alt',event.shiftKey&&'Shift',event.metaKey&&'Meta',!['Control','Alt','Shift','Meta'].includes(event.key)&&(event.key.length===1?event.key.toUpperCase():event.key)].filter(Boolean).join('+');
export default function useRuntimeShortcuts() {
  const navigate = useNavigate();
  useEffect(() => { let bindings = []; const load = () => base44.functions.invoke('runtimeCommand',{command:'GET_SETTINGS'}).then(({data}) => { bindings=data.bindings; const a=data.settings.accessibility; document.documentElement.classList.toggle('reduce-motion',a.reduced_motion); document.documentElement.classList.toggle('high-contrast',a.high_contrast); document.documentElement.classList.toggle('larger-text',a.larger_text); }); load();
    const keydown = (event) => { if (['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)) return; const match=bindings.find(item=>item.binding===eventBinding(event)); if (match?.path) { event.preventDefault(); navigate(match.path); } };
    window.addEventListener('keydown',keydown); window.addEventListener('runtime-settings-updated',load); return()=>{window.removeEventListener('keydown',keydown);window.removeEventListener('runtime-settings-updated',load);};
  },[navigate]);
}