import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const command = body.command;
    const requestId = body.requestId || crypto.randomUUID();

    if (command === 'STUDIO_OVERVIEW') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const [games, releases, locations, connections] = await Promise.all([
        base44.asServiceRole.entities.Game.list(),
        base44.asServiceRole.entities.ContentRelease.list('-created_date', 20),
        base44.asServiceRole.entities.LocationDefinition.list(),
        base44.asServiceRole.entities.Connection.list()
      ]);
      return Response.json({ games, releases, counts: { games: games.length, releases: releases.length, locations: locations.length, connections: connections.length } });
    }

    if (command === 'CREATE_CHARACTER') {
      const game = await base44.asServiceRole.entities.Game.get(body.gameId);
      const releases = await base44.asServiceRole.entities.ContentRelease.filter({ game_id: game.id, status: 'published' }, '-published_at', 1);
      const release = releases[0];
      if (!release) return Response.json({ error: 'This game has no published content.' }, { status: 409 });
      const starts = await base44.asServiceRole.entities.LocationDefinition.filter({ game_id: game.id, content_version: release.version, tags: { '$in': ['start'] } }, '-created_date', 1);
      if (!starts[0]) return Response.json({ error: 'This game has no starting location.' }, { status: 409 });
      await base44.entities.Character.create({ game_id: game.id, content_version: release.version, name: String(body.name || '').trim(), current_location_id: starts[0].id, attributes: {}, resources: { vitality: 100 }, currency: {}, tags: [], version: 1 });
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