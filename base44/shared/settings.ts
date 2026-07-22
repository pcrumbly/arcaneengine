const defaults:any = {
  player: { table_density: 'comfortable', date_format: 'locale', confirmations: true },
  game: { text_speed: 'normal', combat_log_detail: 'standard', tooltip_behavior: 'hover' },
  sound: { master: 80, interface: 70, music: 60, effects: 80, notifications: 80, mute_inactive: false },
  accessibility: { reduced_motion: false, high_contrast: false, larger_text: false }
};
const registry = [
  { command_id:'navigate.dashboard', label:'Open dashboard', category:'Navigation', default_binding:'Alt+1', path:'/' },
  { command_id:'navigate.quests', label:'Open quests', category:'Navigation', default_binding:'Alt+2', path:'/quests' },
  { command_id:'navigate.inventory', label:'Open inventory', category:'Navigation', default_binding:'Alt+3', path:'/inventory' },
  { command_id:'navigate.combat', label:'Open combat', category:'Navigation', default_binding:'Alt+4', path:'/combat' },
  { command_id:'navigate.studio', label:'Open Game Studio', category:'Navigation', default_binding:'Alt+5', path:'/studio' },
  { command_id:'navigate.settings', label:'Open settings', category:'Navigation', default_binding:'Alt+6', path:'/settings' }
];
const allowed:any = {
  player: ['table_density','date_format','confirmations'],
  game: ['text_speed','combat_log_detail','tooltip_behavior'],
  sound: ['master','interface','music','effects','notifications','mute_inactive'],
  accessibility: ['reduced_motion','high_contrast','larger_text']
};
async function load(base44:any, user:any) {
  const [records, custom] = await Promise.all([
    base44.asServiceRole.entities.UserSetting.filter({ user_id:user.id }, 'scope', 20),
    base44.asServiceRole.entities.KeyBinding.filter({ user_id:user.id }, 'command_id', 100)
  ]);
  const settings = Object.fromEntries(Object.entries(defaults).map(([scope,value]) => [scope, { ...value, ...(records.find((item:any) => item.scope === scope)?.values || {}) }]));
  const bindings = registry.map(command => ({ ...command, binding:custom.find((item:any) => item.command_id === command.command_id)?.binding || command.default_binding }));
  return { settings, bindings };
}
export async function handleSettingsCommand(base44:any, user:any, body:any) {
  if (body.command === 'GET_SETTINGS') return Response.json(await load(base44,user));
  if (body.command === 'SAVE_SETTINGS') {
    if (!allowed[body.scope]) return Response.json({ error:'Unknown settings scope.' }, { status:422 });
    const values = Object.fromEntries(Object.entries(body.values || {}).filter(([key]) => allowed[body.scope].includes(key)));
    if (body.scope === 'sound') for (const [key,value] of Object.entries(values)) if (key !== 'mute_inactive' && (!Number.isFinite(value) || Number(value) < 0 || Number(value) > 100)) return Response.json({ error:'Volume values must be between 0 and 100.' }, { status:422 });
    const existing = await base44.asServiceRole.entities.UserSetting.filter({ user_id:user.id, scope:body.scope }, '-updated_date', 1);
    if (existing[0]) await base44.asServiceRole.entities.UserSetting.update(existing[0].id, { values, version:existing[0].version + 1 });
    else await base44.asServiceRole.entities.UserSetting.create({ user_id:user.id, scope:body.scope, values, version:1 });
    return Response.json(await load(base44,user));
  }
  if (body.command === 'SAVE_KEY_BINDING') {
    const command = registry.find(item => item.command_id === body.commandId);
    const binding = String(body.binding || '').trim();
    if (!command || !binding || binding.length > 40) return Response.json({ error:'Invalid shortcut command or binding.' }, { status:422 });
    const custom = await base44.asServiceRole.entities.KeyBinding.filter({ user_id:user.id }, 'command_id', 100);
    const conflict = registry.find(item => item.command_id !== command.command_id && (custom.find((row:any) => row.command_id === item.command_id)?.binding || item.default_binding) === binding);
    if (conflict) return Response.json({ error:`${binding} is already assigned to ${conflict.label}.` }, { status:409 });
    const existing = custom.find((item:any) => item.command_id === command.command_id);
    if (binding === command.default_binding) { if (existing) await base44.asServiceRole.entities.KeyBinding.delete(existing.id); }
    else if (existing) await base44.asServiceRole.entities.KeyBinding.update(existing.id, { binding, version:existing.version + 1 });
    else await base44.asServiceRole.entities.KeyBinding.create({ user_id:user.id, command_id:command.command_id, binding, category:command.category, version:1 });
    return Response.json(await load(base44,user));
  }
  if (body.command === 'RESET_KEY_BINDINGS') {
    await base44.asServiceRole.entities.KeyBinding.deleteMany({ user_id:user.id });
    return Response.json(await load(base44,user));
  }
  return Response.json({ error:'Unknown settings command.' }, { status:400 });
}