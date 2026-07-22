import { evaluateCondition, resolveCombatEffect } from './rules.ts';
import { getPartyContext } from './party.ts';
import { resolveCharacterCapabilities } from './capabilities.ts';
import { publishQuestEvent } from './quests.ts';
const LIVE_STATES = ['CREATED','AWAITING_PARTICIPANTS','ROUND_START','AWAITING_ACTIONS','RESOLVING_ACTIONS','ROUND_END'];
const hashSeed = (value:string) => [...value].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261);
const randomAt = (seed:number, cursor:number) => { let x = (seed + Math.imul(cursor + 1, 0x6D2B79F5)) >>> 0; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; };

async function loadState(base44:any, character:any) {
  character = await base44.entities.Character.get(character.id);
  const game = await base44.asServiceRole.entities.Game.get(character.game_id);
  const partyContext = await getPartyContext(base44, character);
  const individualCombats = await base44.asServiceRole.entities.CombatInstance.filter({ character_id: character.id }, '-updated_date', 20);
  const partyCombats = partyContext.party ? await base44.asServiceRole.entities.CombatInstance.filter({ party_id: partyContext.party.id }, '-updated_date', 20) : [];
  const combats = [...new Map([...individualCombats,...partyCombats].map((item:any)=>[item.id,item])).values()];
  const combat = combats.find((item:any) => item.state !== 'COMPLETED' && item.state !== 'ABORTED') || null;
  const definitions = await base44.asServiceRole.entities.EncounterDefinition.filter({ game_id: character.game_id, content_version: character.content_version }, 'name', 50);
  const encounters = definitions.filter((encounter:any) => !encounter.location_ids?.length || encounter.location_ids.includes(character.current_location_id));
  if (!combat) return { game, character, combat: null, participants: [], events: [], abilities: [], encounters };
  const [participants,events,activeEffects] = await Promise.all([
    base44.asServiceRole.entities.CombatParticipant.filter({ combat_instance_id: combat.id }, '-initiative', 30),
    base44.asServiceRole.entities.CombatEvent.filter({ combat_instance_id: combat.id }, '-sequence', 100),
    base44.asServiceRole.entities.ActiveEffect.filter({ combat_instance_id: combat.id }, '-created_date', 100)
  ]);
  const abilityIds = [...new Set(participants.flatMap((participant:any) => participant.ability_ids || []))];
  const statusKeys = [...new Set(activeEffects.map((effect:any) => effect.status_key))];
  const [abilities,statusDefinitions] = await Promise.all([
    Promise.all(abilityIds.map((id:any) => base44.asServiceRole.entities.AbilityDefinition.get(id))),
    Promise.all(statusKeys.map(async (key:any) => (await base44.asServiceRole.entities.StatusDefinition.filter({ game_id:combat.game_id, content_version:combat.content_version, key }, '-created_date', 1))[0] || null))
  ]);
  const hydratedParticipants=participants.map((participant:any)=>({...participant,active_effects:activeEffects.filter((effect:any)=>effect.target_id===participant.id).map((effect:any)=>({...effect,definition:statusDefinitions.find((definition:any)=>definition?.key===effect.status_key)||null}))}));
  return { game, character, combat, participants:hydratedParticipants, events, abilities, encounters };
}

async function applyStatus(base44:any,combat:any,target:any,ability:any,record:any){
  const definition=(await base44.asServiceRole.entities.StatusDefinition.filter({game_id:combat.game_id,content_version:combat.content_version,key:record.statusKey},'-created_date',1))[0];
  if(!definition)return {...record,type:'ignored',effectType:'applyStatus',reason:`Unknown status ${record.statusKey}`};
  const rows=await base44.asServiceRole.entities.ActiveEffect.filter({combat_instance_id:combat.id,target_type:'combat_participant',target_id:target.id,status_key:definition.key},'-created_date',20),existing=rows[0];
  const incoming=Math.max(1,Number(record.stacks||1)),maximum=Math.max(1,Number(definition.maximum_stacks||1));
  const stacks=definition.stacking==='stack'?Math.min(maximum,Number(existing?.stacks||0)+incoming):definition.stacking==='refresh'&&existing?Number(existing.stacks||1):Math.min(maximum,incoming);
  const remainingTurns=definition.duration_type==='turns'?Math.max(1,Number(record.remainingTurns||1)):undefined;
  const expiresAt=definition.duration_type==='time'?new Date(Date.now()+Math.max(1,Number(record.durationSeconds||60))*1000).toISOString():undefined;
  const payload=expiresAt?{...(existing?.payload||{}),expires_at:expiresAt}:existing?.payload||{};
  const values:any={stacks,source_id:ability.id,payload,version:Number(existing?.version||0)+1};if(remainingTurns!==undefined)values.remaining_turns=remainingTurns;
  if(existing){await base44.asServiceRole.entities.ActiveEffect.update(existing.id,values);if(rows.length>1)await base44.asServiceRole.entities.ActiveEffect.deleteMany({id:{'$in':rows.slice(1).map((row:any)=>row.id)}});}
  else await base44.asServiceRole.entities.ActiveEffect.create({game_id:combat.game_id,content_version:combat.content_version,target_type:'combat_participant',target_id:target.id,combat_instance_id:combat.id,status_key:definition.key,source_id:ability.id,stacks,remaining_turns:remainingTurns,payload,version:1});
  return {...record,statusName:definition.name,stacks,remainingTurns};
}
async function tickStatuses(base44:any,combat:any,participantId:string,rules:any,cursor:number){
  let participant=await base44.asServiceRole.entities.CombatParticipant.get(participantId),resources={...(participant.resources||{})};
  const active=await base44.asServiceRole.entities.ActiveEffect.filter({combat_instance_id:combat.id,target_type:'combat_participant',target_id:participant.id},'created_date',50);
  for(const effect of active){
    const definition=(await base44.asServiceRole.entities.StatusDefinition.filter({game_id:combat.game_id,content_version:combat.content_version,key:effect.status_key},'-created_date',1))[0];if(!definition)continue;
    const timedOut=definition.duration_type==='time'&&effect.payload?.expires_at&&new Date(effect.payload.expires_at).getTime()<=Date.now(),outcomes:any[]=[];
    if(!timedOut)for(const statusEffect of definition.effects||[]){cursor+=1;const resolved=resolveCombatEffect(statusEffect,{actor:participant,target:participant,resources,roll:randomAt(combat.seed,cursor),rules});resources=resolved.resources;outcomes.push(resolved.record);}
    const remaining=definition.duration_type==='turns'?Number(effect.remaining_turns||1)-1:null,expired=timedOut||(remaining!==null&&remaining<=0);
    if(expired)await base44.asServiceRole.entities.ActiveEffect.delete(effect.id);else if(remaining!==null)await base44.asServiceRole.entities.ActiveEffect.update(effect.id,{remaining_turns:remaining,version:Number(effect.version||1)+1});
    const prior=await base44.asServiceRole.entities.CombatEvent.filter({combat_instance_id:combat.id},'-sequence',1);await base44.asServiceRole.entities.CombatEvent.create({game_id:combat.game_id,combat_instance_id:combat.id,sequence:(prior[0]?.sequence||0)+1,event_type:'status.ticked',target_participant_id:participant.id,payload:{status_key:definition.key,status_name:definition.name,stacks:effect.stacks,effects:outcomes,expired},rng_cursor:cursor,occurred_at:new Date().toISOString()});
  }
  const primary=rules?.primary_resource_key,status=primary&&Number(resources[primary]||0)<=0?'incapacitated':participant.status;
  if(active.length)participant=await base44.asServiceRole.entities.CombatParticipant.update(participant.id,{resources,status,version:participant.version+1});
  return {participant,cursor};
}

async function resolveAction(base44:any, combat:any, actor:any, target:any, ability:any, requestId:string, rules:any) {
  let cursor = combat.rng_cursor || 0;
  const actorResources = { ...(actor.resources || {}) };
  for (const [resource, amount] of Object.entries(ability.costs || {})) actorResources[resource] = (actorResources[resource] || 0) - Number(amount);
  await base44.asServiceRole.entities.CombatParticipant.update(actor.id, { resources: actorResources, version: actor.version + 1 });
  let targetResources = { ...(target.resources || {}) };
  const resolution:any[] = [];
  for (const effect of ability.effects || []) {
    cursor += 1;
    const roll = randomAt(combat.seed, cursor);
    const resolved = resolveCombatEffect(effect, { actor, target, resources:targetResources, roll, rules });
    targetResources = resolved.resources;
    const record=resolved.record.type==='applyStatus'?await applyStatus(base44,combat,target,ability,resolved.record):resolved.record;
    resolution.push(record);
    if (record.type === 'removeStatus') await base44.asServiceRole.entities.ActiveEffect.deleteMany({ combat_instance_id:combat.id, target_type:'combat_participant', target_id:target.id, status_key:record.statusKey });
  }
  const primaryResource = rules?.primary_resource_key;
  const status = primaryResource && Number(targetResources[primaryResource] || 0) <= 0 ? 'incapacitated' : target.status;
  await base44.asServiceRole.entities.CombatParticipant.update(target.id, { resources: targetResources, status, version: target.version + 1 });
  const action = await base44.asServiceRole.entities.CombatAction.create({ game_id: combat.game_id, combat_instance_id: combat.id, round: combat.round, actor_participant_id: actor.id, ability_id: ability.id, target_participant_ids: [target.id], client_request_id: requestId, status: 'resolved', resolution: { effects: resolution }, resolved_at: new Date().toISOString() });
  const priorEvents = await base44.asServiceRole.entities.CombatEvent.filter({ combat_instance_id: combat.id }, '-sequence', 1);
  await base44.asServiceRole.entities.CombatEvent.create({ game_id: combat.game_id, combat_instance_id: combat.id, sequence: (priorEvents[0]?.sequence || 0) + 1, event_type: 'action.resolved', actor_participant_id: actor.id, target_participant_id: target.id, payload: { action_id: action.id, ability_id: ability.id, effects: resolution, target_status: status }, rng_cursor: cursor, occurred_at: new Date().toISOString() });
  if(actor.character_id){const actorCharacter=await base44.asServiceRole.entities.Character.get(actor.character_id);await publishQuestEvent(base44,actorCharacter,'combat.ability.used','combat',combat.id,requestId,{ability_id:ability.id,target_participant_id:target.id});}
  const ticked=await tickStatuses(base44,combat,actor.id,rules,cursor);cursor=ticked.cursor;
  return await base44.asServiceRole.entities.CombatInstance.update(combat.id, { rng_cursor: cursor, version: combat.version + 1 });
}

async function conclude(base44:any, combat:any, character:any) {
  const participants = await base44.asServiceRole.entities.CombatParticipant.filter({ combat_instance_id: combat.id }, '-initiative', 30);
  const playerAlive = participants.some((item:any) => item.team === 'player' && item.status === 'active');
  const enemiesAlive = participants.some((item:any) => item.team !== 'player' && item.status === 'active');
  if (playerAlive && enemiesAlive) return combat;
  const state = playerAlive ? 'VICTORY' : 'DEFEAT';
  const encounter = await base44.asServiceRole.entities.EncounterDefinition.get(combat.encounter_definition_id);
  for (const participant of participants.filter((item:any)=>item.team==='player'&&item.character_id)) {
    const member = await base44.asServiceRole.entities.Character.get(participant.character_id);
    const patch:any = { resources:{...(member.resources||{}),...(participant.resources||{})}, version:member.version+1 };
    if (member.id===character.id && state==='VICTORY' && !combat.rewards_granted) { const currency={...(member.currency||{})}; for(const reward of encounter.rewards||[])if(reward.type==='currency')currency[reward.currencyId]=(currency[reward.currencyId]||0)+Number(reward.amount||0); patch.currency=currency; }
    await base44.asServiceRole.entities.Character.update(member.id,patch);
  }
  if (state === 'VICTORY' && !combat.rewards_granted) for(const participant of participants.filter((item:any)=>item.team==='player'&&item.character_id)){const member=await base44.asServiceRole.entities.Character.get(participant.character_id);for(const defeated of participants.filter((item:any)=>item.team!=='player'&&item.status==='incapacitated'))await publishQuestEvent(base44,member,'combat.entity.defeated','combat',combat.id,`combat-${combat.id}:defeated:${defeated.id}`,{entity_definition_id:defeated.source_definition_id||'',participant_id:defeated.id});await publishQuestEvent(base44,member,'combat.encounter.won','combat',combat.id,`combat-${combat.id}`,{encounter_definition_id:encounter.id,party_id:combat.party_id||null});}
  if(combat.party_id){const party=await base44.asServiceRole.entities.Party.get(combat.party_id);await base44.asServiceRole.entities.Party.update(party.id,{state:'active',version:party.version+1});}
  return await base44.asServiceRole.entities.CombatInstance.update(combat.id, { state, rewards_granted: state === 'VICTORY', active_participant_id: null, version: combat.version + 1 });
}

export async function handleCombatCommand(base44:any, user:any, body:any, requestId:string) {
  const character = await base44.entities.Character.get(body.characterId);
  const game = await base44.asServiceRole.entities.Game.get(character.game_id);
  const rules = game.rules || {};
  if (body.command === 'GET_COMBAT') return Response.json(await loadState(base44, character));
  if (body.command === 'START_ENCOUNTER') {
    const partyContext = await getPartyContext(base44, character);
    const individualCombats = await base44.asServiceRole.entities.CombatInstance.filter({ character_id: character.id }, '-updated_date', 20);
    const partyCombats = partyContext.party ? await base44.asServiceRole.entities.CombatInstance.filter({ party_id:partyContext.party.id }, '-updated_date', 20) : [];
    if ([...individualCombats,...partyCombats].some((item:any) => LIVE_STATES.includes(item.state))) return Response.json({ error: 'This character or party is already in combat.' }, { status: 409 });
    const encounter = await base44.asServiceRole.entities.EncounterDefinition.get(body.encounterDefinitionId);
    if (encounter.game_id !== character.game_id || encounter.content_version !== character.content_version) return Response.json({ error: 'Encounter content is not valid for this character.' }, { status: 422 });
    if (encounter.location_ids?.length && !encounter.location_ids.includes(character.current_location_id)) return Response.json({ error: 'This encounter is not available here.' }, { status: 422 });
    const allAbilities = await base44.asServiceRole.entities.AbilityDefinition.filter({ game_id: character.game_id, content_version: character.content_version }, 'name', 100);
    const genericIds=allAbilities.filter((ability:any)=>ability.tags?.includes('basic')).map((ability:any)=>ability.id),fallbackIds=genericIds.length?genericIds:allAbilities.slice(0,1).map((ability:any)=>ability.id);
    if (!fallbackIds.length) return Response.json({ error: 'No combat abilities are configured for this character.' }, { status: 422 });
    const partyCharacters=partyContext.party?partyContext.members.filter((member:any)=>member.readiness==='ready'&&member.character.current_location_id===character.current_location_id&&member.character.content_version===character.content_version).map((member:any)=>member.character):[character];
    const playerRows:any[]=[];for(let index=0;index<partyCharacters.length;index++){const member=partyCharacters[index],capabilities=await resolveCharacterCapabilities(base44,member),abilityIds=capabilities.activeAbilityIds;playerRows.push({game_id:character.game_id,character_id:member.id,team:'player',name:member.name,resources:{...(member.resources||{})},maximum_resources:{...(member.resources||{})},attributes:member.attributes||{},ability_ids:abilityIds,status:'active',initiative:100-index,version:1});}
    let combat = await base44.asServiceRole.entities.CombatInstance.create({ game_id: character.game_id, content_version: character.content_version, character_id: character.id, party_id:partyContext.party?.id||null, encounter_definition_id: encounter.id, state: 'AWAITING_PARTICIPANTS', round: 1, seed: hashSeed(requestId), rng_cursor: 0, rewards_granted: false, version: 1 });
    if(partyContext.party)await base44.asServiceRole.entities.Party.update(partyContext.party.id,{state:'in_combat',version:partyContext.party.version+1});
    const participants = await base44.asServiceRole.entities.CombatParticipant.bulkCreate([...playerRows.map((row:any)=>({...row,combat_instance_id:combat.id})), ...(encounter.participant_templates || []).map((template:any, index:number) => ({ game_id: character.game_id, combat_instance_id: combat.id, team: template.team || 'enemy', name: template.name || `Opponent ${index + 1}`, source_definition_id:template.definition_id||template.npc_definition_id||'', resources: template.resources || { vitality: 30 }, maximum_resources: template.maximum_resources || template.resources || { vitality: 30 }, attributes: template.attributes || {}, ability_ids: template.ability_ids || fallbackIds, status: 'active', initiative: template.initiative || 50 - index, version: 1 }))]);
    const player = participants.find((item:any) => item.team === 'player');
    combat = await base44.asServiceRole.entities.CombatInstance.update(combat.id, { state: 'AWAITING_ACTIONS', active_participant_id: player.id, version: 2 });
    await base44.asServiceRole.entities.AuditEvent.create({ game_id: character.game_id, actor_user_id: user.id, character_id: character.id, command: body.command, request_id: requestId, result: 'accepted', details: { combat_id: combat.id, encounter_definition_id: encounter.id, seed: combat.seed }, occurred_at: new Date().toISOString() });
    return Response.json(await loadState(base44, character));
  }
  if (body.command === 'SELECT_COMBAT_ACTION') {
    let combat = await base44.asServiceRole.entities.CombatInstance.get(body.combatId);
    if (combat.character_id !== character.id) return Response.json({ error: 'Combat ownership could not be verified.' }, { status: 403 });
    const duplicates = await base44.asServiceRole.entities.CombatAction.filter({ combat_instance_id: combat.id, client_request_id: requestId }, '-resolved_at', 1);
    if (duplicates.length) return Response.json(await loadState(base44, character));
    if (combat.state !== 'AWAITING_ACTIONS' || combat.version !== body.combatVersion) return Response.json({ error: 'Combat state changed. Refresh and try again.' }, { status: 409 });
    const actor = await base44.asServiceRole.entities.CombatParticipant.get(combat.active_participant_id);
    const target = await base44.asServiceRole.entities.CombatParticipant.get(body.targetParticipantId);
    const ability = await base44.asServiceRole.entities.AbilityDefinition.get(body.abilityId);
    const actorCharacter = actor.character_id ? await base44.entities.Character.get(actor.character_id) : null;
    if (!actorCharacter || !(actor.ability_ids || []).includes(ability.id)) return Response.json({ error: 'That action is not available to this participant.' }, { status: 422 });
    if (target.combat_instance_id !== combat.id || target.team === actor.team || target.status !== 'active') return Response.json({ error: 'That target is not valid.' }, { status: 422 });
    if (Object.entries(ability.costs || {}).some(([resource, amount]) => (actor.resources?.[resource] || 0) < Number(amount))) return Response.json({ error: 'This participant lacks the required resources.' }, { status: 422 });
    if (!await evaluateCondition(base44, { character:actorCharacter, actor, target }, ability.requirements)) return Response.json({ error: 'This participant does not meet the ability requirements.' }, { status: 422 });
    combat = await resolveAction(base44, combat, actor, target, ability, requestId, rules);
    combat = await conclude(base44, combat, character);
    if (combat.state === 'AWAITING_ACTIONS') {
      let participants = await base44.asServiceRole.entities.CombatParticipant.filter({ combat_instance_id: combat.id }, '-initiative', 30);
      const enemy = participants.find((item:any) => item.team !== 'player' && item.status === 'active');
      const players = participants.filter((item:any) => item.team === 'player' && item.status === 'active');
      const attackedPlayer=players.find((item:any)=>item.id===actor.id)||players[0];
      if (enemy && attackedPlayer) {
        const enemyAbility = await base44.asServiceRole.entities.AbilityDefinition.get(enemy.ability_ids[0]);
        combat = await resolveAction(base44, combat, enemy, attackedPlayer, enemyAbility, `${requestId}:response`, rules);
        combat = await conclude(base44, combat, character);
      }
      if (combat.state === 'AWAITING_ACTIONS') {participants=await base44.asServiceRole.entities.CombatParticipant.filter({combat_instance_id:combat.id},'-initiative',30);const activePlayers=participants.filter((item:any)=>item.team==='player'&&item.status==='active'),priorIndex=Math.max(0,activePlayers.findIndex((item:any)=>item.id===actor.id)),nextIndex=(priorIndex+1)%activePlayers.length,nextPlayer=activePlayers[nextIndex];combat=await base44.asServiceRole.entities.CombatInstance.update(combat.id,{round:combat.round+(nextIndex===0?1:0),active_participant_id:nextPlayer.id,version:combat.version+1});}
    }
    return Response.json(await loadState(base44, character));
  }
  if (body.command === 'COMPLETE_COMBAT') {
    const combat = await base44.asServiceRole.entities.CombatInstance.get(body.combatId);
    if (combat.character_id !== character.id || !['VICTORY','DEFEAT','ESCAPED'].includes(combat.state)) return Response.json({ error: 'Combat cannot be closed.' }, { status: 422 });
    await base44.asServiceRole.entities.CombatInstance.update(combat.id, { state: 'COMPLETED', version: combat.version + 1 });
    await base44.asServiceRole.entities.ActiveEffect.deleteMany({combat_instance_id:combat.id,target_type:'combat_participant'});
    if(combat.party_id){const party=await base44.asServiceRole.entities.Party.get(combat.party_id);if(party.state!=='active')await base44.asServiceRole.entities.Party.update(party.id,{state:'active',version:party.version+1});}
    return Response.json(await loadState(base44, character));
  }
  return Response.json({ error: 'Unknown combat command.' }, { status: 400 });
}