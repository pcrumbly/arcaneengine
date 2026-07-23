import { useState } from 'react';
import { base44 } from '@/api/base44Client';
export default function useNpcInteraction(onResolved){
  const [interaction,setInteraction]=useState(null),[dialogue,setDialogue]=useState(null),[context,setContext]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const invoke=async payload=>{setBusy(true);setError('');try{const {data}=await base44.functions.invoke('runtimeCommand',payload);if(data.interaction){setInteraction(data.interaction);setContext(current=>({...current,characterVersion:data.interaction.character_version}));}if(data.dialogue)setDialogue(data.dialogue);return data;}catch(caught){setError(caught.response?.data?.error||caught.message);}finally{setBusy(false)}};
  const open=async(character,placementId)=>{setContext({characterId:character.id,characterVersion:character.version,placementId});setDialogue(null);await invoke({command:'GET_NPC_INTERACTION',characterId:character.id,placementId});};
  const act=async action=>{if(action.type==='talk')return invoke({command:'START_DIALOGUE',characterId:context.characterId,placementId:context.placementId,actionKey:action.key,requestId:crypto.randomUUID()});await invoke({command:'EXECUTE_NPC_ACTION',characterId:context.characterId,characterVersion:context.characterVersion,placementId:context.placementId,actionKey:action.key,requestId:crypto.randomUUID()});await onResolved();};
  const select=async optionKey=>{await invoke({command:'SELECT_DIALOGUE_OPTION',sessionId:dialogue.session.id,sessionVersion:dialogue.session.version,optionKey,requestId:crypto.randomUUID()});await onResolved();};
  return {interaction,dialogue,busy,error,open,act,select,back:()=>setDialogue(null),close:()=>{setInteraction(null);setDialogue(null);setError('');}};
}