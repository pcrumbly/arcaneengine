import { evaluateCondition, resolveCharacterAttributeValues, resolveDerivedCharacterValues } from './rules.ts';
import { applyCharacterTransaction, applySkillRankTransaction } from './economy.ts';
import { loadSocialContext,publicSocialContext } from './socialSimulation.ts';
import { getPartyContext } from './party.ts';
async function capabilityData(base44:any,character:any){
  const [definitions,records,abilities,items,loadouts]=await Promise.all([
    base44.asServiceRole.entities.SkillDefinition.filter({game_id:character.game_id,content_version:character.content_version},'name',200),
    base44.asServiceRole.entities.CharacterSkill.filter({character_id:character.id},'-updated_date',200),
    base44.asServiceRole.entities.AbilityDefinition.filter({game_id:character.game_id,content_version:character.content_version},'name',200),
    base44.asServiceRole.entities.ItemInstance.filter({character_id:character.id},'-updated_date',500),
    base44.asServiceRole.entities.Loadout.filter({character_id:character.id},'-updated_date',50)
  ]);
  const itemDefinitions=await Promise.all(items.map((item:any)=>base44.asServiceRole.entities.ItemDefinition.get(item.definition_id))),itemRequirementChecks=await Promise.all(itemDefinitions.map((definition:any)=>evaluateCondition(base44,{character},definition.requirements)));
  const inventory=items.map((item:any,index:number)=>({...item,definition:itemDefinitions[index],requirements_met:itemRequirementChecks[index]}));
  const rawSkillRows=definitions.map((definition:any)=>({definition,record:records.find((record:any)=>record.skill_definition_id===definition.id)||null})),requirementChecks=await Promise.all(rawSkillRows.map((row:any)=>evaluateCondition(base44,{character},row.definition.requirements))),skillRows=rawSkillRows.map((row:any,index:number)=>({...row,requirements_met:requirementChecks[index]}));
  const unlocked=new Set(abilities.filter((ability:any)=>ability.tags?.includes('basic')).map((ability:any)=>ability.id));
  for(const row of skillRows)if(Number(row.record?.rank||0)>0)for(const id of row.definition.granted_ability_ids||[])unlocked.add(id);
  for(const item of inventory)if(item.equipped_slot)for(const id of item.definition.granted_ability_ids||[])unlocked.add(id);
  const available=new Set(unlocked);for(const item of inventory)for(const id of item.definition.granted_ability_ids||[])available.add(id);
  const activeLoadout=loadouts.find((loadout:any)=>loadout.is_active)||null;
  const selected=activeLoadout?.active_ability_ids?.length?activeLoadout.active_ability_ids.filter((id:string)=>unlocked.has(id)):[...unlocked];
  const fallback=abilities.filter((ability:any)=>ability.tags?.includes('basic')).map((ability:any)=>ability.id);
  return {definitions,records,skillRows,abilities,inventory,loadouts,activeLoadout,unlockedIds:[...unlocked],availableIds:[...available],activeAbilityIds:selected.length?selected:(fallback.length?fallback:abilities.slice(0,1).map((ability:any)=>ability.id))};
}
export async function resolveCharacterCapabilities(base44:any,character:any){return await capabilityData(base44,character);}
async function load(base44:any,character:any){const data=await capabilityData(base44,character);return {character,skills:data.skillRows,abilities:data.abilities.filter((ability:any)=>data.availableIds.includes(ability.id)),unlockedAbilityIds:data.unlockedIds,items:data.inventory,loadouts:data.loadouts,activeLoadout:data.activeLoadout};}
async function loadProfile(base44:any,character:any){
  const [attributeDefinitions,effects,statusDefinitions,skills,skillDefinitions,items,formulas,game]=await Promise.all([
    base44.asServiceRole.entities.AttributeDefinition.filter({game_id:character.game_id,content_version:character.content_version},'name',200),
    base44.asServiceRole.entities.ActiveEffect.filter({target_type:'character',target_id:character.id},'-updated_date',200),
    base44.asServiceRole.entities.StatusDefinition.filter({game_id:character.game_id,content_version:character.content_version},'name',200),
    base44.asServiceRole.entities.CharacterSkill.filter({character_id:character.id},'-updated_date',200),
    base44.asServiceRole.entities.SkillDefinition.filter({game_id:character.game_id,content_version:character.content_version},'name',200),
    base44.asServiceRole.entities.ItemInstance.filter({character_id:character.id},'-updated_date',500),
    base44.asServiceRole.entities.FormulaDefinition.filter({game_id:character.game_id,content_version:character.content_version},'name',200),
    base44.asServiceRole.entities.Game.get(character.game_id)
  ]);
  const equipped=items.filter((item:any)=>item.equipped_slot),[itemDefinitions,social]=await Promise.all([Promise.all(equipped.map((item:any)=>base44.asServiceRole.entities.ItemDefinition.get(item.definition_id))),loadSocialContext(base44,character)]);
  const expiredEffects=effects.filter((effect:any)=>effect.expires_at&&new Date(effect.expires_at).getTime()<=Date.now());if(expiredEffects.length)await base44.asServiceRole.entities.ActiveEffect.deleteMany({id:{'$in':expiredEffects.map((effect:any)=>effect.id)}});const resolvedEffects=effects.filter((effect:any)=>!expiredEffects.some((expired:any)=>expired.id===effect.id)).map((effect:any)=>({...effect,definition:statusDefinitions.find((definition:any)=>definition.key===effect.status_key)||null})),resolvedEquipment=equipped.map((item:any,index:number)=>({...item,definition:itemDefinitions[index]})),visibleDefinitions=attributeDefinitions.filter((item:any)=>item.visibility!=='hidden'),hiddenKeys=new Set(attributeDefinitions.filter((item:any)=>item.visibility==='hidden').map((item:any)=>item.key)),formulaKeys=new Set(formulas.map((item:any)=>item.key)),attributeDefinitionsPublic=visibleDefinitions.filter((item:any)=>item.category!=='resource'&&!formulaKeys.has(item.key)),publicAttributes=Object.fromEntries(Object.entries(character.attributes||{}).filter(([key])=>!hiddenKeys.has(key)&&!formulaKeys.has(key))),attributeValues=resolveCharacterAttributeValues({...character,attributes:publicAttributes},attributeDefinitionsPublic,resolvedEquipment,resolvedEffects),resourceDefinitions=visibleDefinitions.filter((item:any)=>item.category==='resource'),resourceKeys=[...new Set([...resourceDefinitions.map((item:any)=>item.key),...Object.keys(character.resources||{}).filter(key=>!hiddenKeys.has(key))])],resourceValues=resourceKeys.map(key=>{const definition=resourceDefinitions.find((item:any)=>item.key===key),current=Number(character.resources?.[key]??definition?.default_value??0),configuredMaximum=game.character_defaults?.resources?.[key],maximum=definition?.maximum??configuredMaximum;return {key,name:definition?.name||key,category:'resource',dataType:definition?.data_type||'decimal',current,minimum:definition?.minimum??0,maximum:Number.isFinite(Number(maximum))?Number(maximum):null};});
  return {character:{...character,attributes:Object.fromEntries(attributeValues.map((item:any)=>[item.key,item.base])),resources:Object.fromEntries(resourceValues.map((item:any)=>[item.key,item.current]))},attributeDefinitions:visibleDefinitions,attributeValues,resourceValues,derivedValues:resolveDerivedCharacterValues(character,formulas,resolvedEquipment,resolvedEffects),effects:resolvedEffects,skills:skills.map((record:any)=>({...record,definition:skillDefinitions.find((definition:any)=>definition.id===record.skill_definition_id)||null})),equipment:resolvedEquipment,social:publicSocialContext(social)};
}
async function profileCharacter(base44:any,user:any,characterId:string){
  const owned=await base44.entities.Character.list('-updated_date',100),direct=owned.find((item:any)=>item.id===characterId);if(direct)return direct;
  const target=await base44.asServiceRole.entities.Character.get(characterId);if(user.role==='admin')return target;
  for(const character of owned){const context=await getPartyContext(base44,character);if(context.members.some((member:any)=>member.character.id===target.id))return target;}
  return null;
}
async function validateLoadout(base44:any,character:any,values:any){
  const data=await capabilityData(base44,character),unlocked=new Set(data.unlockedIds),items=new Map(data.inventory.map((item:any)=>[item.id,item])),assignedIds=Object.values(values.equipment_assignments||{});
  if(new Set(assignedIds).size!==assignedIds.length)throw new Error('An item cannot be assigned to more than one equipment slot.');
  for(const itemId of assignedIds){const assigned:any=items.get(itemId);if(!assigned||!await evaluateCondition(base44,{character},assigned.definition.requirements))throw new Error('An assigned item cannot be equipped by this character.');for(const id of assigned.definition.granted_ability_ids||[])unlocked.add(id);}
  for(const id of values.active_ability_ids||[])if(!unlocked.has(id))throw new Error('A selected ability is not available to this character.');
  for(const id of values.quick_slots||[]){const item:any=items.get(id);if(!item||!item.definition.actions?.includes('use'))throw new Error('A quick-slot item must be usable and belong to this character.');}
  for(const [slot,id] of Object.entries(values.equipment_assignments||{})){const item:any=items.get(id);if(!item||(item.definition.equipment_slots||[]).includes(slot)===false)throw new Error(`The equipment assigned to ${slot} is invalid.`);}
}
export async function handleCapabilityCommand(base44:any,user:any,body:any,requestId:string){
  const character=body.command==='GET_CHARACTER_PROFILE'?await profileCharacter(base44,user,body.characterId):await base44.entities.Character.get(body.characterId);
  if(!character)return Response.json({error:'Character access could not be verified.'},{status:403});
  if(body.command==='GET_CAPABILITIES')return Response.json(await load(base44,character));
  if(body.command==='GET_CHARACTER_PROFILE')return Response.json(await loadProfile(base44,character));
  if(body.command==='TRAIN_SKILL'){
    const duplicate=await base44.asServiceRole.entities.AuditEvent.filter({actor_user_id:user.id,request_id:requestId,result:'accepted'},'-occurred_at',1);if(duplicate.length)return Response.json(await load(base44,character));
    const definition=await base44.asServiceRole.entities.SkillDefinition.get(body.skillDefinitionId);if(definition.game_id!==character.game_id||definition.content_version!==character.content_version)return Response.json({error:'Skill content is not valid for this character.'},{status:422});
    if(!await evaluateCondition(base44,{character},definition.requirements))return Response.json({error:'This character does not meet the skill requirements.'},{status:422});
    const rows=await base44.asServiceRole.entities.CharacterSkill.filter({character_id:character.id,skill_definition_id:definition.id},'-updated_date',1),record=rows[0],rank=Number(record?.rank||0);if(record?.processed_transaction_ids?.includes(`${requestId}:training-rank`))return Response.json(await load(base44,await base44.entities.Character.get(character.id)));if(rank>=Number(definition.max_rank||1))return Response.json({error:'This skill is already at maximum rank.'},{status:409});
    const currency={...(character.currency||{})};for(const [key,amount] of Object.entries(definition.training_costs||{})){if(Number(currency[key]||0)<Number(amount))return Response.json({error:`Not enough ${key} to train this skill.`},{status:422});currency[key]-=Number(amount);}
    const applied=await applyCharacterTransaction(base44,character.id,`${requestId}:training-cost`,(fresh:any)=>{const next={...(fresh.currency||{})};for(const [key,amount] of Object.entries(definition.training_costs||{})){if(Number(next[key]||0)<Number(amount))throw new Error(`Not enough ${key} to train this skill.`);next[key]-=Number(amount);}return {currency:next};});await applySkillRankTransaction(base44,applied.character,definition,`${requestId}:training-rank`);
    await base44.asServiceRole.entities.AuditEvent.create({game_id:character.game_id,actor_user_id:user.id,character_id:character.id,command:body.command,request_id:requestId,result:'accepted',details:{skill_definition_id:definition.id,rank:rank+1},occurred_at:new Date().toISOString()});return Response.json(await load(base44,await base44.entities.Character.get(character.id)));
  }
  if(body.command==='SAVE_LOADOUT'){
    const name=String(body.values?.name||'').trim();if(!name)return Response.json({error:'Loadout name is required.'},{status:422});await validateLoadout(base44,character,body.values);
    const payload={name,equipment_assignments:body.values.equipment_assignments||{},active_ability_ids:body.values.active_ability_ids||[],quick_slots:body.values.quick_slots||[],tactical_preferences:body.values.tactical_preferences||{},formation_position:String(body.values.formation_position||'')};
    if(body.loadoutId){const current=await base44.asServiceRole.entities.Loadout.get(body.loadoutId);if(current.character_id!==character.id)return Response.json({error:'Loadout ownership could not be verified.'},{status:403});if(current.version!==body.loadoutVersion)return Response.json({error:'Loadout changed. Refresh and try again.'},{status:409});await base44.asServiceRole.entities.Loadout.update(current.id,{...payload,version:current.version+1});}else await base44.asServiceRole.entities.Loadout.create({game_id:character.game_id,content_version:character.content_version,character_id:character.id,...payload,is_active:false,version:1});
    return Response.json(await load(base44,character));
  }
  const current=await base44.asServiceRole.entities.Loadout.get(body.loadoutId);if(current.character_id!==character.id)return Response.json({error:'Loadout ownership could not be verified.'},{status:403});if(current.version!==body.loadoutVersion)return Response.json({error:'Loadout changed. Refresh and try again.'},{status:409});
  if(body.command==='ACTIVATE_LOADOUT'){
    await validateLoadout(base44,character,current);const data=await capabilityData(base44,character),assignments=current.equipment_assignments||{};
    const equipmentUpdates=data.inventory.filter((item:any)=>item.equipped_slot||Object.values(assignments).includes(item.id)).map((item:any)=>({id:item.id,equipped_slot:Object.entries(assignments).find(([,id])=>id===item.id)?.[0]||null,version:item.version+1}));if(equipmentUpdates.length)await base44.asServiceRole.entities.ItemInstance.bulkUpdate(equipmentUpdates);
    const others=data.loadouts.filter((loadout:any)=>loadout.is_active&&loadout.id!==current.id);if(others.length)await base44.asServiceRole.entities.Loadout.bulkUpdate(others.map((loadout:any)=>({id:loadout.id,is_active:false,version:loadout.version+1})));await base44.asServiceRole.entities.Loadout.update(current.id,{is_active:true,version:current.version+1});return Response.json(await load(base44,character));
  }
  if(body.command==='DELETE_LOADOUT'){if(current.is_active)return Response.json({error:'Activate another loadout before deleting this one.'},{status:409});await base44.asServiceRole.entities.Loadout.delete(current.id);return Response.json(await load(base44,character));}
  return Response.json({error:'Unknown capability command.'},{status:400});
}