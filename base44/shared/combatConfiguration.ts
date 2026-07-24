export function resolveConfiguredTargets(participants:any[],actor:any,ability:any,requestedId?:string,random=0,targetPolicy='first_active'){
  const targeting=ability.targeting||{},team=targeting.team||'enemy';
  let candidates=participants.filter(item=>item.status==='active'&&(team==='self'?item.id===actor.id:team==='ally'?item.team===actor.team&&(targeting.include_self===true||item.id!==actor.id):team==='any'?true:item.team!==actor.team));
  if(targetPolicy==='lowest_primary_resource'&&targeting.primary_resource_key)candidates.sort((left,right)=>Number(left.resources?.[targeting.primary_resource_key]||0)-Number(right.resources?.[targeting.primary_resource_key]||0));
  if(targetPolicy==='highest_primary_resource'&&targeting.primary_resource_key)candidates.sort((left,right)=>Number(right.resources?.[targeting.primary_resource_key]||0)-Number(left.resources?.[targeting.primary_resource_key]||0));
  if(targetPolicy==='random_active'&&candidates.length){const index=Math.floor(random*candidates.length);candidates=[...candidates.slice(index),...candidates.slice(0,index)];}
  const requested=candidates.find(item=>item.id===requestedId);if(requested)candidates=[requested,...candidates.filter(item=>item.id!==requested.id)];
  const count=targeting.count==='all'?candidates.length:Math.max(1,Math.floor(Number(targeting.count||1)));
  return candidates.slice(0,count);
}

export function configuredCombatOutcome(participants:any[],conditions:any={}){
  const active=participants.filter(item=>item.status==='active'),surviveTeams=Array.isArray(conditions.surviveTeams)&&conditions.surviveTeams.length?conditions.surviveTeams:['player'];
  if(surviveTeams.some((team:string)=>!active.some(item=>item.team===team)))return 'DEFEAT';
  const configured=Array.isArray(conditions.eliminateTeams)&&conditions.eliminateTeams.length?conditions.eliminateTeams:null,eliminateTeams=configured||[...new Set(participants.filter(item=>item.team!=='player').map(item=>item.team))];
  return eliminateTeams.length&&eliminateTeams.every((team:string)=>!active.some(item=>item.team===team))?'VICTORY':null;
}