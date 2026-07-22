import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { handleCombatCommand } from '../../shared/combat.ts';
import { handleSettingsCommand } from '../../shared/settings.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const command = body.command;
    const requestId = body.requestId || crypto.randomUUID();
    if (['GET_COMBAT','START_ENCOUNTER','SELECT_COMBAT_ACTION','COMPLETE_COMBAT'].includes(command)) return await handleCombatCommand(base44, user, body, requestId);
    if (['GET_SETTINGS','SAVE_SETTINGS','SAVE_KEY_BINDING','RESET_KEY_BINDINGS'].includes(command)) return await handleSettingsCommand(base44, user, body);
    const loadInventory = async (characterId) => {
      const character = await base44.entities.Character.get(characterId);
      const containers = await base44.asServiceRole.entities.Container.filter({ character_id: character.id }, 'name', 30);
      const items = await base44.asServiceRole.entities.ItemInstance.filter({ character_id: character.id }, '-acquired_at', 200);
      const definitions = await Promise.all(items.map((item) => base44.asServiceRole.entities.ItemDefinition.get(item.definition_id)));
      const rows = items.map((item, index) => ({ ...item, definition: definitions[index] }));
      const weight = rows.reduce((sum, item) => sum + (item.definition.weight || 0) * item.quantity, 0);
      const capacity = containers.reduce((sum, container) => sum + (container.capacity || 0), 0);
      return { character, containers, items: rows, summary: { weight, capacity, equipped: rows.filter((item) => item.equipped_slot).length } };
    };
    const loadQuests = async (characterId) => {
      const character = await base44.entities.Character.get(characterId);
      const definitions = await base44.asServiceRole.entities.QuestDefinition.filter({ game_id: character.game_id, content_version: character.content_version }, 'name', 100);
      const instances = await base44.asServiceRole.entities.QuestInstance.filter({ character_id: character.id }, '-updated_date', 100);
      const rows = await Promise.all(instances.map(async (instance) => ({ ...instance, definition: definitions.find((definition) => definition.id === instance.definition_id), objectives: await base44.asServiceRole.entities.ObjectiveInstance.filter({ quest_instance_id: instance.id }, 'objective_key', 100) })));
      const instancedIds = new Set(instances.filter((instance) => instance.state !== 'ABANDONED').map((instance) => instance.definition_id));
      return { character, available: definitions.filter((definition) => !instancedIds.has(definition.id)), quests: rows };
    };
    const evaluateVisitObjectives = async (character, locationId, eventRequestId) => {
      const quests = await base44.asServiceRole.entities.QuestInstance.filter({ character_id: character.id, state: 'ACTIVE' }, '-accepted_at', 100);
      for (const quest of quests) {
        const objectives = await base44.asServiceRole.entities.ObjectiveInstance.filter({ quest_instance_id: quest.id }, 'objective_key', 100);
        const matches = objectives.filter((objective) => objective.state === 'ACTIVE' && objective.objective_type === 'visitLocation' && objective.target_id === locationId);
        if (matches.length) await base44.asServiceRole.entities.ObjectiveInstance.bulkUpdate(matches.map((objective) => ({ id: objective.id, current_count: objective.required_count, state: 'COMPLETED', version: objective.version + 1 })));
        const remaining = objectives.filter((objective) => !objective.optional && objective.state !== 'COMPLETED' && !matches.some((match) => match.id === objective.id));
        if (!remaining.length && (matches.length || objectives.every((objective) => objective.optional || objective.state === 'COMPLETED'))) {
          const definition = await base44.asServiceRole.entities.QuestDefinition.get(quest.definition_id);
          const freshCharacter = await base44.entities.Character.get(character.id);
          const currency = { ...(freshCharacter.currency || {}) };
          const resources = { ...(freshCharacter.resources || {}) };
          for (const reward of definition.rewards || []) {
            if (reward.type === 'currency') currency[reward.currencyId] = (currency[reward.currencyId] || 0) + Number(reward.amount || 0);
            if (reward.type === 'resourceChange') resources[reward.resourceId] = Math.max(0, (resources[reward.resourceId] || 0) + Number(reward.amount || 0));
          }
          await base44.entities.Character.update(character.id, { currency, resources, version: freshCharacter.version + 1 });
          await base44.asServiceRole.entities.QuestInstance.update(quest.id, { state: 'COMPLETED', completed_at: new Date().toISOString(), reward_state: 'granted', version: quest.version + 1 });
          await base44.asServiceRole.entities.DomainEvent.create({ game_id: character.game_id, character_id: character.id, event_type: 'quest.completed', aggregate_type: 'quest', aggregate_id: quest.id, request_id: eventRequestId, content_version: character.content_version, payload: { definition_id: definition.id }, occurred_at: new Date().toISOString() });
        }
      }
    };

    if (command === 'STUDIO_OVERVIEW') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const [games, releases, locations, connections, quests] = await Promise.all([
        base44.asServiceRole.entities.Game.list(),
        base44.asServiceRole.entities.ContentRelease.list('-created_date', 20),
        base44.asServiceRole.entities.LocationDefinition.list(),
        base44.asServiceRole.entities.Connection.list(),
        base44.asServiceRole.entities.QuestDefinition.list()
      ]);
      return Response.json({ games, releases, counts: { games: games.length, releases: releases.length, locations: locations.length, connections: connections.length, quests: quests.length } });
    }

    if (command === 'CREATE_CHARACTER') {
      const game = await base44.asServiceRole.entities.Game.get(body.gameId);
      const releases = await base44.asServiceRole.entities.ContentRelease.filter({ game_id: game.id, status: 'published' }, '-published_at', 1);
      const release = releases[0];
      if (!release) return Response.json({ error: 'This game has no published content.' }, { status: 409 });
      const starts = await base44.asServiceRole.entities.LocationDefinition.filter({ game_id: game.id, content_version: release.version, tags: { '$in': ['start'] } }, '-created_date', 1);
      if (!starts[0]) return Response.json({ error: 'This game has no starting location.' }, { status: 409 });
      const character = await base44.entities.Character.create({ game_id: game.id, content_version: release.version, name: String(body.name || '').trim(), current_location_id: starts[0].id, attributes: {}, resources: { vitality: 100 }, currency: {}, tags: [], version: 1 });
      const container = await base44.asServiceRole.entities.Container.create({ game_id: game.id, character_id: character.id, name: 'Carried items', container_type: 'character', capacity: 30, version: 1 });
      const starters = await base44.asServiceRole.entities.ItemDefinition.filter({ game_id: game.id, content_version: release.version, tags: { '$in': ['starter'] } }, 'name', 20);
      if (starters.length) await base44.asServiceRole.entities.ItemInstance.bulkCreate(starters.map((definition) => ({ game_id: game.id, content_version: release.version, definition_id: definition.id, container_id: container.id, character_id: character.id, quantity: definition.stack_limit > 1 ? 3 : 1, quality: 'standard', bound_state: 'unbound', custom_properties: {}, applied_modifications: [], acquired_at: new Date().toISOString(), version: 1 })));
    }

    if (command === 'GET_INVENTORY') return Response.json(await loadInventory(body.characterId));
    if (command === 'GET_QUESTS') return Response.json(await loadQuests(body.characterId));

    if (command === 'ACCEPT_QUEST') {
      const character = await base44.entities.Character.get(body.characterId);
      const duplicate = await base44.asServiceRole.entities.AuditEvent.filter({ actor_user_id: user.id, request_id: requestId, result: 'accepted' }, '-occurred_at', 1);
      if (!duplicate.length) {
        const definition = await base44.asServiceRole.entities.QuestDefinition.get(body.questDefinitionId);
        if (definition.game_id !== character.game_id || definition.content_version !== character.content_version) return Response.json({ error: 'Quest content is not valid for this character.' }, { status: 422 });
        const existing = await base44.asServiceRole.entities.QuestInstance.filter({ character_id: character.id, definition_id: definition.id }, '-created_date', 20);
        if (existing.some((instance) => instance.state !== 'ABANDONED') && definition.repeatability === 'never') return Response.json({ error: 'This quest cannot be accepted again.' }, { status: 409 });
        const instance = await base44.asServiceRole.entities.QuestInstance.create({ game_id: character.game_id, content_version: character.content_version, definition_id: definition.id, character_id: character.id, state: 'ACTIVE', accepted_at: new Date().toISOString(), branch_state: {}, reward_state: 'pending', version: 1 });
        const objectives = definition.objective_graph?.objectives || [];
        if (objectives.length) await base44.asServiceRole.entities.ObjectiveInstance.bulkCreate(objectives.map((objective) => ({ game_id: character.game_id, quest_instance_id: instance.id, character_id: character.id, objective_key: objective.key, objective_type: objective.type, target_id: objective.targetId || '', required_count: objective.count || 1, current_count: 0, state: 'ACTIVE', optional: !!objective.optional, version: 1 })));
        await base44.asServiceRole.entities.DomainEvent.create({ game_id: character.game_id, character_id: character.id, event_type: 'quest.accepted', aggregate_type: 'quest', aggregate_id: instance.id, request_id: requestId, content_version: character.content_version, payload: { definition_id: definition.id }, occurred_at: new Date().toISOString() });
        await base44.asServiceRole.entities.AuditEvent.create({ game_id: character.game_id, actor_user_id: user.id, character_id: character.id, command, request_id: requestId, result: 'accepted', details: { quest_instance_id: instance.id, definition_id: definition.id }, occurred_at: new Date().toISOString() });
        await evaluateVisitObjectives(character, character.current_location_id, requestId);
      }
      return Response.json(await loadQuests(character.id));
    }

    if (command === 'ABANDON_QUEST') {
      const character = await base44.entities.Character.get(body.characterId);
      const instance = await base44.asServiceRole.entities.QuestInstance.get(body.questInstanceId);
      if (instance.character_id !== character.id) return Response.json({ error: 'Quest ownership could not be verified.' }, { status: 403 });
      if (instance.state !== 'ACTIVE' || instance.version !== body.questVersion) return Response.json({ error: 'Quest state changed. Refresh and try again.' }, { status: 409 });
      await base44.asServiceRole.entities.QuestInstance.update(instance.id, { state: 'ABANDONED', reward_state: 'none', version: instance.version + 1 });
      await base44.asServiceRole.entities.AuditEvent.create({ game_id: character.game_id, actor_user_id: user.id, character_id: character.id, command, request_id: requestId, result: 'accepted', details: { quest_instance_id: instance.id }, occurred_at: new Date().toISOString() });
      return Response.json(await loadQuests(character.id));
    }

    if (command === 'EQUIP_ITEM' || command === 'UNEQUIP_ITEM' || command === 'USE_ITEM') {
      const character = await base44.entities.Character.get(body.characterId);
      const duplicate = await base44.asServiceRole.entities.AuditEvent.filter({ actor_user_id: user.id, request_id: requestId, result: 'accepted' }, '-occurred_at', 1);
      if (!duplicate.length) {
        const item = await base44.asServiceRole.entities.ItemInstance.get(body.itemId);
        if (item.character_id !== character.id) return Response.json({ error: 'Item ownership could not be verified.' }, { status: 403 });
        if (item.version !== body.itemVersion) return Response.json({ error: 'Item state changed. Refresh and try again.' }, { status: 409 });
        const definition = await base44.asServiceRole.entities.ItemDefinition.get(item.definition_id);
        if (command === 'EQUIP_ITEM') {
          const slot = body.slot;
          if (!(definition.equipment_slots || []).includes(slot)) return Response.json({ error: 'That item cannot use the selected slot.' }, { status: 422 });
          const equipped = await base44.asServiceRole.entities.ItemInstance.filter({ character_id: character.id, equipped_slot: slot }, '-updated_date', 20);
          if (equipped.length) await base44.asServiceRole.entities.ItemInstance.bulkUpdate(equipped.map((current) => ({ id: current.id, equipped_slot: null, version: current.version + 1 })));
          await base44.asServiceRole.entities.ItemInstance.update(item.id, { equipped_slot: slot, version: item.version + 1 });
        }
        if (command === 'UNEQUIP_ITEM') await base44.asServiceRole.entities.ItemInstance.update(item.id, { equipped_slot: null, version: item.version + 1 });
        if (command === 'USE_ITEM') {
          if (!(definition.actions || []).includes('use')) return Response.json({ error: 'This item is not usable.' }, { status: 422 });
          const resources = { ...(character.resources || {}) };
          for (const effect of definition.use_effects || []) if (effect.type === 'resourceChange') resources[effect.resourceId] = Math.max(0, (resources[effect.resourceId] || 0) + Number(effect.amount || 0));
          await base44.entities.Character.update(character.id, { resources, version: character.version + 1 });
          if (item.quantity <= 1) await base44.asServiceRole.entities.ItemInstance.delete(item.id);
          else await base44.asServiceRole.entities.ItemInstance.update(item.id, { quantity: item.quantity - 1, version: item.version + 1 });
        }
        await base44.asServiceRole.entities.AuditEvent.create({ game_id: character.game_id, actor_user_id: user.id, character_id: character.id, command, request_id: requestId, result: 'accepted', details: { item_id: item.id, definition_id: definition.id, slot: body.slot || null }, occurred_at: new Date().toISOString() });
      }
      return Response.json(await loadInventory(character.id));
    }

    if (command === 'MOVE_TO_LOCATION') {
      const duplicates = await base44.asServiceRole.entities.AuditEvent.filter({ actor_user_id: user.id, request_id: requestId, result: 'accepted' }, '-occurred_at', 1);
      if (!duplicates.length) {
        const character = await base44.entities.Character.get(body.characterId);
        if (character.version !== body.characterVersion) return Response.json({ error: 'Character state changed. Refresh and try again.' }, { status: 409 });
        const connections = await base44.asServiceRole.entities.Connection.filter({ from_location_id: character.current_location_id, to_location_id: body.destinationId, content_version: character.content_version, enabled: true });
        const connection = connections[0];
        if (!connection) return Response.json({ error: 'That route is not currently available.' }, { status: 422 });
        const missingTags = (connection.required_tags || []).filter((tag) => !(character.tags || []).includes(tag));
        if (missingTags.length) return Response.json({ error: 'This character does not meet the route requirements.' }, { status: 422 });
        await base44.entities.Character.update(character.id, { current_location_id: body.destinationId, version: character.version + 1 });
        await base44.asServiceRole.entities.DomainEvent.create({ game_id: character.game_id, character_id: character.id, event_type: 'character.location.entered', aggregate_type: 'character', aggregate_id: character.id, request_id: requestId, content_version: character.content_version, payload: { from: character.current_location_id, to: body.destinationId }, occurred_at: new Date().toISOString() });
        await evaluateVisitObjectives(character, body.destinationId, requestId);
        await base44.asServiceRole.entities.AuditEvent.create({ game_id: character.game_id, actor_user_id: user.id, character_id: character.id, command, request_id: requestId, result: 'accepted', details: { from: character.current_location_id, to: body.destinationId, travel_time: connection.travel_time }, occurred_at: new Date().toISOString() });
      }
    }

    const characters = await base44.entities.Character.list('-updated_date', 20);
    const games = await base44.asServiceRole.entities.Game.filter({ status: 'published' }, 'title', 20);
    const selected = characters.find((item) => item.id === body.characterId) || characters[0] || null;
    if (!selected) return Response.json({ games, characters, character: null, location: null, exits: [], activity: [] });
    const location = await base44.asServiceRole.entities.LocationDefinition.get(selected.current_location_id);
    const links = await base44.asServiceRole.entities.Connection.filter({ from_location_id: selected.current_location_id, content_version: selected.content_version, enabled: true }, 'label', 30);
    const destinations = await Promise.all(links.map((link) => base44.asServiceRole.entities.LocationDefinition.get(link.to_location_id)));
    const exits = links.map((link, index) => ({ ...link, destination: destinations[index] }));
    const activity = await base44.asServiceRole.entities.AuditEvent.filter({ actor_user_id: user.id, character_id: selected.id, result: 'accepted' }, '-occurred_at', 8);
    return Response.json({ games, characters, character: selected, location, exits, activity });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});