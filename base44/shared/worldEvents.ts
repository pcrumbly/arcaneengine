import { evaluateCondition, resolveCharacterEffects } from './rules.ts';

const phaseOf=(date:Date)=>{const hour=date.getUTCHours();return hour<6?'night':hour<12?'morning':hour<18?'afternoon':hour<21?'evening':'night';};
const hash=(value:string)=>[...value].reduce((total,char)=>((total*31)+char.charCodeAt(0))>>>0,0);
const payloadMatches=(expected:any={},actual:any={})=>Object.entries(expected).every(([key,value])=>actual?.[key]===value);

async function environmentFor(base44:any,character:any){
  const [states,location]=await Promise.all([base44.asServiceRole.entities.WorldState.filter({game_id:character.game_id,content_version:character.content_version},'-updated_date',1),base44.asServiceRole.entities.LocationDefinition.get(character.current_location_id)]),state=states[0],region=String(location?.region_key||'default'),weatherKey=state?.weather_by_region?.[region],weather=weatherKey?(await base44.asServiceRole.entities.WeatherDefinition.filter({game_id:character.game_id,content_version:character.content_version,region_key:region,key:weatherKey},'-created_date',1))[0]:null,time=new Date(state?.current_time||new Date().toISOString());
  return {world:{current_time:time.toISOString(),phase:phaseOf(time),version:state?.version},weather,location};
}

function timeOccurrences(definition:any,context:any){
  const trigger=definition.trigger||{},before=new Date(context.before).getTime(),after=new Date(context.after).getTime();
  if(trigger.type==='at_time'){const due=new Date(trigger.at_time).getTime();return Number.isFinite(due)&&before<due&&due<=after?[`at:${new Date(due).toISOString()}`]:[];}
  if(!['interval','random_check'].includes(trigger.type))return [];
  const interval=Math.max(1,Number(trigger.interval_minutes||60))*60000,anchor=new Date(trigger.starts_at||0).getTime(),first=Math.floor((before-anchor)/interval)+1,last=Math.floor((after-anchor)/interval),keys=[];for(let slot=first;slot<=last&&keys.length<100;slot++)if(slot>=0&&(trigger.type!=='random_check'||(hash(`${definition.id}:${context.character.id}:${slot}`)%100000)/100000<=Number(trigger.probability||0)))keys.push(`${trigger.type}:${slot}`);return keys;
}

function signalOccurrences(definition:any,context:any){
  const trigger=definition.trigger||{};
  if(trigger.type==='domain_event'&&context.event&&trigger.event_type===context.event.event_type&&payloadMatches(trigger.payload_matches,context.event.payload))return [`event:${context.event.id}`];
  if(trigger.type==='weather_change')return (context.weatherChanges||[]).filter((change:any)=>(!trigger.region_key||trigger.region_key===change.region)&&(!trigger.from_weather_key||trigger.from_weather_key===change.from)&&(!trigger.to_weather_key||trigger.to_weather_key===change.to)).map((change:any)=>`weather:${change.region}:${context.slot}:${change.from||'none'}:${change.to||'none'}`);
  return [];
}

async function execute(base44:any,character:any,definition:any,occurrenceKey:string,context:any){
  const existing=await base44.asServiceRole.entities.WorldEventExecution.filter({definition_id:definition.id,character_id:character.id,occurrence_key:occurrenceKey},'-created_date',1);if(existing.length)return [];
  const execution=await base44.asServiceRole.entities.WorldEventExecution.create({game_id:character.game_id,content_version:character.content_version,definition_id:definition.id,character_id:character.id,occurrence_key:occurrenceKey,trigger_type:definition.trigger.type,status:'processing',world_time:context.world?.current_time,source_event_id:context.event?.id,version:1,triggered_at:new Date().toISOString()});
  try{
    let fresh=await base44.asServiceRole.entities.Character.get(character.id);if(!await evaluateCondition(base44,{character:fresh,event:context.event,world:context.world,weather:context.weather,location:context.location},definition.conditions||{})){await base44.asServiceRole.entities.WorldEventExecution.update(execution.id,{status:'skipped',version:2});return [];}
    const resolved=await resolveCharacterEffects(base44,fresh,(definition.effects||[]).map((effect:any)=>({...effect,sourceType:effect.sourceType||'world_event',sourceId:effect.sourceId||definition.id})));if((definition.effects||[]).length)fresh=await base44.asServiceRole.entities.Character.update(fresh.id,{...resolved.patch,version:Number(fresh.version||1)+1});
    const emitted=[];for(const [index,specification] of (definition.emitted_events||[]).entries()){const requestId=`world-event:${definition.id}:${occurrenceKey}:${index}`,duplicates=await base44.asServiceRole.entities.DomainEvent.filter({character_id:fresh.id,event_type:specification.event_type,request_id:requestId},'-occurred_at',1),event=duplicates[0]||await base44.asServiceRole.entities.DomainEvent.create({game_id:fresh.game_id,character_id:fresh.id,event_type:specification.event_type,aggregate_type:specification.aggregate_type||'world_event',aggregate_id:specification.aggregate_id||definition.id,request_id:requestId,content_version:fresh.content_version,payload:{...(specification.payload||{}),world_event_key:definition.key},occurred_at:context.world?.current_time||new Date().toISOString()});emitted.push(event);}
    await base44.asServiceRole.entities.WorldEventExecution.update(execution.id,{status:'completed',outcomes:resolved.outcomes,emitted_event_ids:emitted.map((event:any)=>event.id),version:2});return emitted;
  }catch(error){await base44.asServiceRole.entities.WorldEventExecution.update(execution.id,{status:'failed',error:String(error.message||error),version:2});throw error;}
}

export async function processWorldSignals(base44:any,character:any,context:any,depth=0){
  if(depth>5)return [];const environment=context.world?context:({...context,...await environmentFor(base44,character)}),definitions=await base44.asServiceRole.entities.WorldEventDefinition.filter({game_id:character.game_id,content_version:character.content_version,enabled:true},'-priority',500),emitted=[];
  for(const definition of definitions){const keys=context.before&&context.after?timeOccurrences(definition,environment):signalOccurrences(definition,environment);for(const key of keys)emitted.push(...await execute(base44,character,definition,key,environment));}
  for(const event of [...emitted])emitted.push(...await processWorldSignals(base44,character,{...environment,event,before:null,after:null,weatherChanges:[]},depth+1));return emitted;
}