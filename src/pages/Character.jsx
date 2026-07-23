import { useEffect,useState } from 'react';
import { base44 } from '@/api/base44Client';
import CharacterSummary from '@/components/character/CharacterSummary';
import CharacterValues from '@/components/character/CharacterValues';
import CharacterEffects from '@/components/character/CharacterEffects';
import CharacterProgression from '@/components/character/CharacterProgression';
import DerivedValues from '@/components/character/DerivedValues';
import PageLayout from '@/components/runtime/PageLayout';

export default function Character(){
  const [profile,setProfile]=useState(null),[empty,setEmpty]=useState(false),[error,setError]=useState('');
  useEffect(()=>{base44.functions.invoke('runtimeCommand',{command:'GET_STATE'}).then(({data})=>{if(!data.character){setEmpty(true);return;}return base44.functions.invoke('runtimeCommand',{command:'GET_CHARACTER_PROFILE',characterId:data.character.id});}).then(response=>response&&setProfile(response.data)).catch(caught=>setError(caught.response?.data?.error||caught.message));},[]);
  if(error)return <div role="alert" className="m-6 rounded border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>;
  if(empty)return <div className="p-6"><h2 className="text-2xl font-semibold">No active character</h2><p className="mt-2 text-sm text-slate-400">Create a character from the Runtime page first.</p></div>;
  if(!profile)return <div className="p-6 text-sm text-slate-400">Loading character profile…</div>;
  const visible=profile.attributeDefinitions.filter(item=>item.visibility!=='hidden');
  return <PageLayout eyebrow="Character / Profile" title="Character sheet" description="Inspect attributes, resources, progression, equipment, and active effects."><div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]"><div className="space-y-4"><CharacterSummary character={profile.character}/><CharacterValues title="Attributes" values={profile.character.attributes} definitions={visible}/><CharacterValues title="Resources" values={profile.character.resources} definitions={visible}/><DerivedValues values={profile.derivedValues}/><CharacterProgression skills={profile.skills} equipment={profile.equipment} currency={profile.character.currency}/></div><CharacterEffects effects={profile.effects}/></div></PageLayout>;
}