import { evaluateCondition, resolveCombatEffect } from './rules.ts';
const LIVE_STATES = ['CREATED','AWAITING_PARTICIPANTS','ROUND_START','AWAITING_ACTIONS','RESOLVING_ACTIONS','ROUND_END'];
const hashSeed = (value:string) => [...value].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261);
const randomAt = (seed:number, cursor:number) => { let x = (seed + Math.imul(cursor + 1, 0x6D2B79F5)) >>> 0; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; };

async function loadState(base44:any, character:any) {
  character = await base44.entities.Character.get(character.id);
  const combats = await base44.asServiceRole.entities.CombatInstance.filter({ character_id: character.id }, '-updated_date', 20);
  const combat = combats.find((item:any) => item.state !== 'COMPLETED' && item.state !== 'ABORTED') || null;
  const definitions = await base44.asServiceRole.entities.EncounterDefinition.filter({ game_id: character.game_id, content_version: character.content_version }, 'name', 50);
  const encounters = definitions.filter((encounter:any) => !encounter.location_ids?.length || encounter.location_ids.includes(character.current_location_id));
  if (!combat) return { character, combat: null, participants: [], events: [], abilities: [], encounters };
  const participants = await base44.asServiceRole.entities.CombatParticipant.filter({ combat_instance_id: combat.id }, '-initiative', 30);
  const events = await base44.asServiceRole.entities.CombatEvent.filter({ combat_instance_id: combat.id }, '-sequence', 100);
  const abilityIds = [...new Set(participants.flatMap((participant:any) => participant.ability_ids || []))];
  const abilities = await Promise.all(abilityIds.map((id:any) => base44.asServiceRole.entities.AbilityDefinition.get(id)));
  return { character, combat, participants, events, abilities, encounters };
}

async function resolveAction(base44:any, combat:any, actor:any, target:any, ability:any, requestId:string) {
  let cursor = combat.rng_cursor || 0;
  const actorResources = { ...(actor.resources || {}) };
  for (const [resource, amount] of Object.entries(ability.costs || {})) actorResources[resource] = (actorResources[resource] || 0) - Number(amount);
  await base44.asServiceRole.entities.CombatParticipant.update(actor.id, { resources: actorResources, version: actor.version + 1 });
  let targetResources = { ...(target.resources || {}) };
  const resolution:any[] = [];
  for (const effect of ability.effects || []) {
    cursor += 1;
    const roll = randomAt(combat.seed, cursor);
    const resolved = resolveCombatEffect(effect, { actor, target, resources:targetResources, roll });
    targetResources = resolved.resources;
    resolution.push(resolved.record);
    if (resolved.record.type === 'applyStatus') await base44.asServiceRole.entities.ActiveEffect.create({ game_id:combat.game_id, content_version:combat.content_version, target_type:'combat_participant', target_id:target.id, combat_instance_id:combat.id, status_key:resolved.record.statusKey, source_id:ability.id, stacks:resolved.record.stacks, remaining_turns:resolved.record.remainingTurns, payload:{}, version:1 });
    if (resolved.record.type === 'removeStatus') await base44.asServiceRole.entities.ActiveEffect.deleteMany({ target_type:'combat_participant', target_id:target.id, status_key:resolved.record.statusKey });
  }
  const status = (targetResources.vitality || 0) <= 0 ? 'incapacitated' : target.status;
  await base44.asServiceRole.entities.CombatParticipant.update(target.id, { resources: targetResources, status, version: target.version + 1 });
  const action = await base44.asServiceRole.entities.CombatAction.create({ game_id: combat.game_id, combat_instance_id: combat.id, round: combat.round, actor_participant_id: actor.id, ability_id: ability.id, target_participant_ids: [target.id], client_request_id: requestId, status: 'resolved', resolution: { effects: resolution }, resolved_at: new Date().toISOString() });
  const priorEvents = await base44.asServiceRole.entities.CombatEvent.filter({ combat_instance_id: combat.id }, '-sequence', 1);
  await base44.asServiceRole.entities.CombatEvent.create({ game_id: combat.game_id, combat_instance_id: combat.id, sequence: (priorEvents[0]?.sequence || 0) + 1, event_type: 'action.resolved', actor_participant_id: actor.id, target_participant_id: target.id, payload: { action_id: action.id, ability_id: ability.id, effects: resolution, target_status: status }, rng_cursor: cursor, occurred_at: new Date().toISOString() });
  return await base44.asServiceRole.entities.CombatInstance.update(combat.id, { rng_cursor: cursor, version: combat.version + 1 });
}

async function conclude(base44:any, combat:any, character:any) {
  const participants = await base44.asServiceRole.entities.CombatParticipant.filter({ combat_instance_id: combat.id }, '-initiative', 30);
  const playerAlive = participants.some((item:any) => item.team === 'player' && item.status === 'active');
  const enemiesAlive = participants.some((item:any) => item.team !== 'player' && item.status === 'active');
  if (playerAlive && enemiesAlive) return combat;
  const state = playerAlive ? 'VICTORY' : 'DEFEAT';
  const player = participants.find((item:any) => item.team === 'player');
  const fresh = await base44.entities.Character.get(character.id);
  const resources = { ...(fresh.resources || {}), ...(player?.resources || {}) };
  const currency = { ...(fresh.currency || {}) };
  const encounter = await base44.asServiceRole.entities.EncounterDefinition.get(combat.encounter_definition_id);
  if (state === 'VICTORY' && !combat.rewards_granted) {
    for (const reward of encounter.rewards || []) if (reward.type === 'currency') currency[reward.currencyId] = (currency[reward.currencyId] || 0) + Number(reward.amount || 0);
    await base44.asServiceRole.entities.DomainEvent.create({ game_id: character.game_id, character_id: character.id, event_type: 'combat.encounter.won', aggregate_type: 'combat', aggregate_id: combat.id, request_id: `combat-${combat.id}`, content_version: character.content_version, payload: { encounter_definition_id: encounter.id }, occurred_at: new Date().toISOString() });
  }
  await base44.entities.Character.update(character.id, { currency, resources, version: fresh.version + 1 });
  return await base44.asServiceRole.entities.CombatInstance.update(combat.id, { state, rewards_granted: state === 'VICTORY', active_participant_id: null, version: combat.version + 1 });
}

export async function handleCombatCommand(base44:any, user:any, body:any, requestId:string) {
  const character = await base44.entities.Character.get(body.characterId);
  if (body.command === 'GET_COMBAT') return Response.json(await loadState(base44, character));
  if (body.command === 'START_ENCOUNTER') {
    const allCombats = await base44.asServiceRole.entities.CombatInstance.filter({ character_id: character.id }, '-updated_date', 20);
    if (allCombats.some((item:any) => LIVE_STATES.includes(item.state))) return Response.json({ error: 'This character is already in combat.' }, { status: 409 });
    const encounter = await base44.asServiceRole.entities.EncounterDefinition.get(body.encounterDefinitionId);
    if (encounter.game_id !== character.game_id || encounter.content_version !== character.content_version) return Response.json({ error: 'Encounter content is not valid for this character.' }, { status: 422 });
    if (encounter.location_ids?.length && !encounter.location_ids.includes(character.current_location_id)) return Response.json({ error: 'This encounter is not available here.' }, { status: 422 });
    const allAbilities = await base44.asServiceRole.entities.AbilityDefinition.filter({ game_id: character.game_id, content_version: character.content_version }, 'name', 100);
    const loadouts = await base44.asServiceRole.entities.Loadout.filter({ character_id: character.id, is_active: true }, '-updated_date', 1);
    const playerAbilityIds = loadouts[0]?.active_ability_ids?.length ? loadouts[0].active_ability_ids : allAbilities.filter((ability:any) => ability.tags?.includes('basic')).map((ability:any) => ability.id);
    const fallbackIds = playerAbilityIds.length ? playerAbilityIds : allAbilities.slice(0, 1).map((ability:any) => ability.id);
    if (!fallbackIds.length) return Response.json({ error: 'No combat abilities are configured for this character.' }, { status: 422 });
    let combat = await base44.asServiceRole.entities.CombatInstance.create({ game_id: character.game_id, content_version: character.content_version, character_id: character.id, encounter_definition_id: encounter.id, state: 'AWAITING_PARTICIPANTS', round: 1, seed: hashSeed(requestId), rng_cursor: 0, rewards_granted: false, version: 1 });
    const participants = await base44.asServiceRole.entities.CombatParticipant.bulkCreate([{ game_id: character.game_id, combat_instance_id: combat.id, character_id: character.id, team: 'player', name: character.name, resources: { ...(character.resources || {}), vitality: character.resources?.vitality || 100 }, maximum_resources: { vitality: 100 }, attributes: character.attributes || {}, ability_ids: fallbackIds, status: 'active', initiative: 100, version: 1 }, ...(encounter.participant_templates || []).map((template:any, index:number) => ({ game_id: character.game_id, combat_instance_id: combat.id, team: template.team || 'enemy', name: template.name || `Opponent ${index + 1}`, resources: template.resources || { vitality: 30 }, maximum_resources: template.maximum_resources || template.resources || { vitality: 30 }, attributes: template.attributes || {}, ability_ids: template.ability_ids || fallbackIds, status: 'active', initiative: template.initiative || 50 - index, version: 1 }))]);
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
    if (actor.character_id !== character.id || !(actor.ability_ids || []).includes(ability.id)) return Response.json({ error: 'That action is not available to this participant.' }, { status: 422 });
    if (target.combat_instance_id !== combat.id || target.team === actor.team || target.status !== 'active') return Response.json({ error: 'That target is not valid.' }, { status: 422 });
    if (Object.entries(ability.costs || {}).some(([resource, amount]) => (actor.resources?.[resource] || 0) < Number(amount))) return Response.json({ error: 'This participant lacks the required resources.' }, { status: 422 });
    if (!await evaluateCondition(base44, { character, actor, target }, ability.requirements)) return Response.json({ error: 'This participant does not meet the ability requirements.' }, { status: 422 });
    combat = await resolveAction(base44, combat, actor, target, ability, requestId);
    combat = await conclude(base44, combat, character);
    if (combat.state === 'AWAITING_ACTIONS') {
      const participants = await base44.asServiceRole.entities.CombatParticipant.filter({ combat_instance_id: combat.id }, '-initiative', 30);
      const enemy = participants.find((item:any) => item.team !== 'player' && item.status === 'active');
      const player = participants.find((item:any) => item.team === 'player' && item.status === 'active');
      if (enemy && player) {
        const enemyAbility = await base44.asServiceRole.entities.AbilityDefinition.get(enemy.ability_ids[0]);
        combat = await resolveAction(base44, combat, enemy, player, enemyAbility, `${requestId}:response`);
        combat = await conclude(base44, combat, character);
      }
      if (combat.state === 'AWAITING_ACTIONS') combat = await base44.asServiceRole.entities.CombatInstance.update(combat.id, { round: combat.round + 1, active_participant_id: player.id, version: combat.version + 1 });
    }
    return Response.json(await loadState(base44, character));
  }
  if (body.command === 'COMPLETE_COMBAT') {
    const combat = await base44.asServiceRole.entities.CombatInstance.get(body.combatId);
    if (combat.character_id !== character.id || !['VICTORY','DEFEAT','ESCAPED'].includes(combat.state)) return Response.json({ error: 'Combat cannot be closed.' }, { status: 422 });
    await base44.asServiceRole.entities.CombatInstance.update(combat.id, { state: 'COMPLETED', version: combat.version + 1 });
    return Response.json(await loadState(base44, character));
  }
  return Response.json({ error: 'Unknown combat command.' }, { status: 400 });
}