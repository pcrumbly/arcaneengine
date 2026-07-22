const defaults = [
  { route:'/', label:'Runtime', module:'world', order:10 },
  { route:'/quests', label:'Quests', module:'quests', order:20 },
  { route:'/inventory', label:'Inventory', module:'inventory', order:30 },
  { route:'/skills', label:'Skills', module:'skills', order:35 },
  { route:'/party', label:'Party', module:'party', order:40 },
  { route:'/combat', label:'Combat', module:'combat', order:50 },
  { route:'/studio', label:'Game Studio', module:'studio', order:90 },
  { route:'/settings', label:'Settings', module:'settings', order:100 }
];
const routes = new Set(defaults.map(item => item.route));
export function resolveNavigation(game) {
  const configured = game?.navigation?.length ? game.navigation : defaults;
  const modules = new Set(game?.enabled_modules || []);
  return configured.filter(item => routes.has(item.route) && item.visible !== false && (!item.module || !modules.size || modules.has(item.module) || ['studio','settings'].includes(item.module))).sort((a,b) => (a.order || 0) - (b.order || 0));
}
function rgb(hex, fallback) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return fallback;
  return `${parseInt(hex.slice(1,3),16)} ${parseInt(hex.slice(3,5),16)} ${parseInt(hex.slice(5,7),16)}`;
}
export function resolveTheme(game) {
  return { '--runtime-background':rgb(game?.theme?.background,'7 17 31'), '--runtime-surface':rgb(game?.theme?.surface,'10 23 40'), '--runtime-accent':rgb(game?.theme?.accent,'34 211 238'), '--runtime-text':rgb(game?.theme?.text,'241 245 249') };
}
export const term = (game, key, fallback) => game?.terminology?.[key] || fallback;