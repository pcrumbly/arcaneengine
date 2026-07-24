import { grantQuestItem } from './inventory.ts';
import { applyCharacterTransaction } from './economy.ts';

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
  const questKey=new Map(questDefs.map((row:any)=>[row.id,row.key])),itemKey=new Map(itemDefs.map((row:any)=>[row.id,row.key])),itemNames=new Map(itemDefs.map((row:any)=>[row.key,row.name])),skillKey=new Map(skillDefs.map((row:any)=>[row.id,row.key])),progressByDefinition=new Map(),progressGroups=new Map();
  for(const row of stored){const group=progressGroups.get(row.achievement_definition_id)||[];group.push(row);progressGroups.set(row.achievement_definition_id,group);}
  for(const [definitionId,group] of progressGroups){group.sort((left:any,right:any)=>String(left.created_date).localeCompare(String(right.created_date)));progressByDefinition.set(definitionId,group[0]);if(group.length>1)await base44.asServiceRole.entities.AchievementProgress.deleteMany({id:{'$in':group.slice(1).map((row:any)=>row.id)}});}
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
    const completedAt=existing?.completed_at||(computedComplete?new Date().toISOString():undefined),progressKey=`${character.id}:${definition.id}`;
    if(!existing){const prior=await base44.asServiceRole.entities.AchievementProgress.filter({progress_key:progressKey},'created_date',10);progress=prior[0]||await base44.asServiceRole.entities.AchievementProgress.create({game_id:character.game_id,content_version:character.content_version,character_id:character.id,achievement_definition_id:definition.id,progress_key:progressKey,criteria_values:criteriaValues,percent,completed_at:completedAt,reward_state:'pending',reward_transaction_ids:[],version:1});const canonical=await base44.asServiceRole.entities.AchievementProgress.filter({progress_key:progressKey},'created_date',10);progress=canonical[0]||progress;if(canonical.length>1)await base44.asServiceRole.entities.AchievementProgress.deleteMany({id:{'$in':canonical.slice(1).map((row:any)=>row.id)}});}
    else if(JSON.stringify(existing.criteria_values)!==JSON.stringify(criteriaValues)||existing.percent!==percent||completedAt!==existing.completed_at||existing.progress_key!==progressKey)progress=await base44.asServiceRole.entities.AchievementProgress.update(existing.id,{progress_key:progressKey,criteria_values:criteriaValues,percent,completed_at:completedAt,version:existing.version+1});
    const hidden=definition.hidden&&!progress.completed_at;
    rows.push({progress,definition:hidden?{id:definition.id,name:'Hidden achievement',description:'Complete its secret requirements to reveal it.',category:definition.category,hidden:true,points:definition.points,rewards:[]}:definition,criteria:criteria.map((criterion:any,index:number)=>({...criterion,current:values[index],target:amount(criterion.amount)})),reward_labels:(definition.rewards||[]).map((reward:any)=>rewardLabel(reward,itemNames))});
  }
  return {character,achievements:rows,summary:{total:rows.length,completed:rows.filter((row:any)=>row.progress.completed_at).length,claimed:rows.filter((row:any)=>row.progress.claimed_at).length,points:rows.filter((row:any)=>row.progress.completed_at).reduce((sum:number,row:any)=>sum+Number(row.definition.points||0),0)}};
}

async function recordRewardTransaction(base44:any,progressId:string,transactionId:string){const fresh=await base44.asServiceRole.entities.AchievementProgress.get(progressId),transactions=fresh.reward_transaction_ids||[];if(transactions.includes(transactionId))return fresh;return await base44.asServiceRole.entities.AchievementProgress.update(fresh.id,{reward_transaction_ids:[...transactions,transactionId],version:Number(fresh.version||1)+1});}
async function claimReward(base44:any,user:any,character:any,body:any,requestId:string){
  let progress=await base44.asServiceRole.entities.AchievementProgress.get(body.progressId);
  if(progress.character_id!==character.id)return Response.json({error:'Achievement ownership could not be verified.'},{status:403});
  const progressRows=await base44.asServiceRole.entities.AchievementProgress.filter({character_id:character.id,achievement_definition_id:progress.achievement_definition_id},'created_date',20),canonical=progressRows[0];
  if(canonical?.id!==progress.id)return Response.json({error:'Achievement progress was consolidated. Refresh and try again.'},{status:409});
  if(progress.claimed_at||progress.reward_state==='granted')return null;
  if(progress.reward_state!=='granting'&&progress.version!==body.progressVersion)return Response.json({error:'Achievement progress changed. Refresh and try again.'},{status:409});
  if(!progress.completed_at)return Response.json({error:'This achievement is not complete.'},{status:422});
  const definition=await base44.asServiceRole.entities.AchievementDefinition.get(progress.achievement_definition_id),rewards=definition.rewards||[],itemRewards=rewards.filter((reward:any)=>reward.type==='item'),itemDefinitions=itemRewards.length?await base44.asServiceRole.entities.ItemDefinition.filter({game_id:character.game_id,content_version:character.content_version,key:{'$in':itemRewards.map((reward:any)=>reward.key)}},'name',100):[];
  if(itemRewards.some((reward:any)=>!itemDefinitions.some((item:any)=>item.key===reward.key)))return Response.json({error:'An achievement item reward is not available in this content version.'},{status:422});
  if(progress.reward_state!=='granting')progress=await base44.asServiceRole.entities.AchievementProgress.update(progress.id,{reward_state:'granting',version:Number(progress.version||1)+1});
  const transactionBase=`achievement:${character.id}:${definition.id}`,stateTransaction=`${transactionBase}:state`;
  await applyCharacterTransaction(base44,character.id,stateTransaction,(fresh:any)=>{const currency={...(fresh.currency||{})},resources={...(fresh.resources||{})},tags=[...(fresh.tags||[])];for(const reward of rewards){const quantity=amount(reward.amount);if(reward.type==='currency')currency[reward.key]=Number(currency[reward.key]||0)+quantity;if(reward.type==='resource')resources[reward.key]=Number(resources[reward.key]||0)+quantity;if(reward.type==='tag'&&!tags.includes(reward.key))tags.push(reward.key);}return {currency,resources,tags};});
  progress=await recordRewardTransaction(base44,progress.id,stateTransaction);
  for(const [index,reward] of itemRewards.entries()){const itemDefinition:any=itemDefinitions.find((item:any)=>item.key===reward.key),transactionId=`${transactionBase}:item:${index}`;await grantQuestItem(base44,character,{itemDefinitionId:itemDefinition.id,quantity:amount(reward.amount)},transactionId);progress=await recordRewardTransaction(base44,progress.id,transactionId);}
  const expected=[stateTransaction,...itemRewards.map((_:any,index:number)=>`${transactionBase}:item:${index}`)],confirmed=expected.every(transactionId=>(progress.reward_transaction_ids||[]).includes(transactionId));
  if(!confirmed)throw new Error('Achievement reward delivery is incomplete.');
  await base44.asServiceRole.entities.AchievementProgress.update(progress.id,{reward_state:'granted',claimed_at:new Date().toISOString(),version:Number(progress.version||1)+1});
  await base44.asServiceRole.entities.AuditEvent.create({game_id:character.game_id,actor_user_id:user.id,character_id:character.id,command:'CLAIM_ACHIEVEMENT_REWARD',request_id:requestId,result:'accepted',details:{achievement_definition_id:definition.id,progress_id:progress.id,reward_transactions:expected},occurred_at:new Date().toISOString()});
  return null;
}

export async function handleAchievementCommand(base44:any,user:any,body:any,requestId:string){
  const character=await base44.entities.Character.get(body.characterId);
  if(body.command==='CLAIM_ACHIEVEMENT_REWARD'){const response=await claimReward(base44,user,character,body,requestId);if(response)return response;const updatedCharacter=await base44.entities.Character.get(body.characterId);return Response.json(await loadAchievementRows(base44,updatedCharacter));}
  return Response.json(await loadAchievementRows(base44,character));
}