import { inventoryContainersFor } from './inventory.ts';

const amount=(value:any)=>Math.max(1,Number(value||1));
const rewardLabel=(reward:any,itemNames:Map<string,string>)=>{const key=reward.type==='item'?itemNames.get(reward.key)||reward.key:reward.key;if(reward.type==='tag')return `Tag: ${key}`;return `${amount(reward.amount)} ${key}`;};

async function loadAchievementRows(base44:any,character:any){
  const [definitions,stored,quests,items,skills,combats,questDefs,itemDefs,skillDefs]=await Promise.all([
    base44.asServiceRole.entities.AchievementDefinition.filter({game_id:character.game_id,content_version:character.content_version},'name',200),
    base44.asServiceRole.entities.AchievementProgress.filter({character_id:character.id},'-updated_date',200),
    base44.asServiceRole.entities.QuestInstance.filter({character_id:character.id},'-updated_date',500),
    base44.asServiceRole.entities.ItemInstance.filter({character_id:character.id},'-updated_date',500),
    base44.asServiceRole.entities.CharacterSkill.filter({character_id:character.id},'-updated_date',500),
    base44.asServiceRole.entities.CombatInstance.filter({character_id:character.id},'-updated_date',500),
    base44.asServiceRole.entities.QuestDefinition.filter({game_id:character.game_id,content_version:character.content_version},'name',300),
    base44.asServiceRole.entities.ItemDefinition.filter({game_id:character.game_id,content_version:character.content_version},'name',300),
    base44.asServiceRole.entities.SkillDefinition.filter({game_id:character.game_id,content_version:character.content_version},'name',300)
  ]);
  const questKey=new Map(questDefs.map((row:any)=>[row.id,row.key])),itemKey=new Map(itemDefs.map((row:any)=>[row.id,row.key])),itemNames=new Map(itemDefs.map((row:any)=>[row.key,row.name])),skillKey=new Map(skillDefs.map((row:any)=>[row.id,row.key])),progressByDefinition=new Map(stored.map((row:any)=>[row.achievement_definition_id,row]));
  const readValue=(criterion:any)=>{const key=criterion.target_key;switch(criterion.type){
    case 'quest_completed':return quests.filter((row:any)=>row.state==='COMPLETED'&&(!key||questKey.get(row.definition_id)===key)).length;
    case 'item_quantity':return items.filter((row:any)=>!key||itemKey.get(row.definition_id)===key).reduce((sum:number,row:any)=>sum+Number(row.quantity||0),0);
    case 'skill_rank':return Math.max(0,...skills.filter((row:any)=>!key||skillKey.get(row.skill_definition_id)===key).map((row:any)=>Number(row.rank||0)));
    case 'currency':return Number(character.currency?.[key]||0);case 'resource':return Number(character.resources?.[key]||0);case 'attribute':return Number(character.attributes?.[key]||0);
    case 'combat_wins':return combats.filter((row:any)=>row.state==='VICTORY'||(row.state==='COMPLETED'&&row.rewards_granted)).length;default:return 0;
  }};
  const rows=[];
  for(const definition of definitions){
    const criteria=definition.criteria||[],values=criteria.map(readValue),ratios=criteria.map((criterion:any,index:number)=>Math.min(1,values[index]/amount(criterion.amount))),computedComplete=criteria.length>0&&(definition.criteria_logic==='any'?ratios.some((ratio:number)=>ratio>=1):ratios.every((ratio:number)=>ratio>=1)),existing:any=progressByDefinition.get(definition.id),complete=Boolean(existing?.completed_at)||computedComplete,percent=complete?100:Math.round(100*(definition.criteria_logic==='any'?Math.max(0,...ratios):(ratios.reduce((sum:number,value:number)=>sum+value,0)/(ratios.length||1)))),criteriaValues=Object.fromEntries(criteria.map((criterion:any,index:number)=>[`${criterion.type}:${criterion.target_key||'*'}`,values[index]]));
    let progress=existing;
    const completedAt=existing?.completed_at||(computedComplete?new Date().toISOString():undefined);
    if(!existing)progress=await base44.asServiceRole.entities.AchievementProgress.create({game_id:character.game_id,content_version:character.content_version,character_id:character.id,achievement_definition_id:definition.id,criteria_values:criteriaValues,percent,completed_at:completedAt,version:1});
    else if(JSON.stringify(existing.criteria_values)!==JSON.stringify(criteriaValues)||existing.percent!==percent||completedAt!==existing.completed_at)progress=await base44.asServiceRole.entities.AchievementProgress.update(existing.id,{criteria_values:criteriaValues,percent,completed_at:completedAt,version:existing.version+1});
    const hidden=definition.hidden&&!progress.completed_at;
    rows.push({progress,definition:hidden?{id:definition.id,name:'Hidden achievement',description:'Complete its secret requirements to reveal it.',category:definition.category,hidden:true,points:definition.points,rewards:[]}:definition,criteria:criteria.map((criterion:any,index:number)=>({...criterion,current:values[index],target:amount(criterion.amount)})),reward_labels:(definition.rewards||[]).map((reward:any)=>rewardLabel(reward,itemNames))});
  }
  return {character,achievements:rows,summary:{total:rows.length,completed:rows.filter((row:any)=>row.progress.completed_at).length,claimed:rows.filter((row:any)=>row.progress.claimed_at).length,points:rows.filter((row:any)=>row.progress.completed_at).reduce((sum:number,row:any)=>sum+Number(row.definition.points||0),0)}};
}

async function claimReward(base44:any,user:any,character:any,body:any,requestId:string){
  const progress=await base44.asServiceRole.entities.AchievementProgress.get(body.progressId);
  if(progress.character_id!==character.id)return Response.json({error:'Achievement ownership could not be verified.'},{status:403});
  if(progress.version!==body.progressVersion)return Response.json({error:'Achievement progress changed. Refresh and try again.'},{status:409});
  if(!progress.completed_at)return Response.json({error:'This achievement is not complete.'},{status:422});
  if(progress.claimed_at)return Response.json({error:'This reward has already been claimed.'},{status:409});
  const definition=await base44.asServiceRole.entities.AchievementDefinition.get(progress.achievement_definition_id),rewards=definition.rewards||[],itemRewards=rewards.filter((reward:any)=>reward.type==='item'),itemDefinitions=itemRewards.length?await base44.asServiceRole.entities.ItemDefinition.filter({game_id:character.game_id,content_version:character.content_version,key:{'$in':itemRewards.map((reward:any)=>reward.key)}},'name',100):[],containers=itemRewards.length?await inventoryContainersFor(base44,character):[],container=containers.find((row:any)=>row.container_type==='character')||containers[0];
  if(itemRewards.some((reward:any)=>!itemDefinitions.some((definition:any)=>definition.key===reward.key)))return Response.json({error:'An achievement item reward is not available in this content version.'},{status:422});
  if(itemRewards.length&&!container)return Response.json({error:'This character has no inventory container.'},{status:409});
  const patch:any={currency:{...(character.currency||{})},resources:{...(character.resources||{})},tags:[...(character.tags||[])],version:character.version+1};
  for(const reward of rewards){const quantity=amount(reward.amount);if(reward.type==='currency')patch.currency[reward.key]=Number(patch.currency[reward.key]||0)+quantity;if(reward.type==='resource')patch.resources[reward.key]=Number(patch.resources[reward.key]||0)+quantity;if(reward.type==='tag'&&!patch.tags.includes(reward.key))patch.tags.push(reward.key);}
  await base44.entities.Character.update(character.id,patch);
  if(itemRewards.length){const creates=[];for(const reward of itemRewards){const definition:any=itemDefinitions.find((row:any)=>row.key===reward.key);let remaining=amount(reward.amount),limit=Math.max(1,Number(definition.stack_limit||1));while(remaining>0){const quantity=Math.min(remaining,limit);creates.push({game_id:character.game_id,content_version:character.content_version,definition_id:definition.id,container_id:container.id,owner_type:'character',owner_id:character.id,character_id:character.id,quantity,quality:'standard',bound_state:'unbound',custom_properties:{},applied_modifications:[],acquired_at:new Date().toISOString(),version:1});remaining-=quantity;}}if(creates.length)await base44.asServiceRole.entities.ItemInstance.bulkCreate(creates);}
  await base44.asServiceRole.entities.AchievementProgress.update(progress.id,{claimed_at:new Date().toISOString(),version:progress.version+1});
  await base44.asServiceRole.entities.AuditEvent.create({game_id:character.game_id,actor_user_id:user.id,character_id:character.id,command:'CLAIM_ACHIEVEMENT_REWARD',request_id:requestId,result:'accepted',details:{achievement_definition_id:definition.id,progress_id:progress.id},occurred_at:new Date().toISOString()});
  return null;
}

export async function handleAchievementCommand(base44:any,user:any,body:any,requestId:string){
  const character=await base44.entities.Character.get(body.characterId);
  if(body.command==='CLAIM_ACHIEVEMENT_REWARD'){const response=await claimReward(base44,user,character,body,requestId);if(response)return response;const updatedCharacter=await base44.entities.Character.get(body.characterId);return Response.json(await loadAchievementRows(base44,updatedCharacter));}
  return Response.json(await loadAchievementRows(base44,character));
}