import { resolveInteractions } from './interactions.ts';
import { resolveCharacterEffects } from './rules.ts';

async function loadTarget(base44:any,character:any,targetType:string,targetId:string){
  const entities:any={location:'LocationDefinition',npc:'NPCInstance',item:'ItemInstance',character:'Character'},entityName=entities[targetType];
  if(!entityName)throw new Error(`Unsupported contextual target type ${targetType}.`);
  const target=await base44.asServiceRole.entities[entityName].get(targetId);
  if(targetType==='location'&&target.id!==character.current_location_id)throw new Error('Location actions are only available at the current location.');
  if(targetType==='item'&&target.character_id!==character.id)throw new Error('Item ownership could not be verified.');
  if(target.game_id&&target.game_id!==character.game_id)throw new Error('The target belongs to a different game.');
  if(target.content_version&&target.content_version!==character.content_version)throw new Error('The target belongs to a different content version.');
  return target;
}

async function actionContext(base44:any,character:any,targetType:string,targetId:string){
  const target=await loadTarget(base44,character,targetType,targetId),location=targetType==='location'?target:await base44.asServiceRole.entities.LocationDefinition.get(character.current_location_id),context={character,actor:character,target,location,gameId:character.game_id,contentVersion:character.content_version,tagTypes:{target:targetType}};
  return {target,context,actions:await resolveInteractions(base44,context)};
}

export async function handleContextualActionCommand(base44:any,user:any,body:any,requestId:string){
  const character=await base44.entities.Character.get(body.characterId),resolved=await actionContext(base44,character,body.targetType,body.targetId);
  if(body.command==='GET_CONTEXTUAL_ACTIONS')return Response.json({character,target:resolved.target,actions:resolved.actions});
  if(character.version!==body.characterVersion)return Response.json({error:'Character state changed. Refresh and try again.'},{status:409});
  const action=resolved.actions.find((item:any)=>item.actionKey===body.actionKey&&item.available);
  if(!action)return Response.json({error:'That action is not currently available.'},{status:422});
  const effects=await resolveCharacterEffects(base44,character,action.effects.success),updated=await base44.entities.Character.update(character.id,{...effects.patch,version:character.version+1}),events=(action.events.success||[]).map((event:any)=>({game_id:character.game_id,character_id:character.id,event_type:event.event_type||event.type||action.actionKey,aggregate_type:body.targetType,aggregate_id:body.targetId,request_id:requestId,content_version:character.content_version,payload:{...(event.payload||{}),action_key:action.actionKey},occurred_at:new Date().toISOString()}));
  if(events.length)await base44.asServiceRole.entities.DomainEvent.bulkCreate(events);
  await base44.asServiceRole.entities.AuditEvent.create({game_id:character.game_id,actor_user_id:user.id,character_id:character.id,command:body.command,request_id:requestId,result:'accepted',details:{action_key:action.actionKey,target_type:body.targetType,target_id:body.targetId,outcomes:effects.outcomes},occurred_at:new Date().toISOString()});
  const refreshed=await actionContext(base44,updated,body.targetType,body.targetId);
  return Response.json({character:updated,target:refreshed.target,actions:refreshed.actions,outcomes:effects.outcomes});
}