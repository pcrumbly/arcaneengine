import { engineModules, engineModuleRoutes } from '@/lib/engineModules';
const registered=new Map(engineModules.map(item=>[item.route,item]));
export function resolveNavigation(game,translations={}) {
  const configured = game?.navigation?.length ? game.navigation : engineModules;
  const modules = new Set(game?.enabled_modules || []);
  return configured.filter(item => (engineModuleRoutes.has(item.route) || /^\/module\/[a-z0-9._-]+$/i.test(item.route)) && item.visible !== false && (!item.module || !modules.size || modules.has(item.module) || (item.module==='journal'&&modules.has('quests')) || ['studio','settings','messages','account'].includes(item.module))).map(item=>{const definition=registered.get(item.route),labelKey=item.label_key||definition?.labelKey;return {...definition,...item,label:translations[labelKey]||item.label||definition?.label};}).sort((a,b) => (a.order || 0) - (b.order || 0));
}
function rgb(hex, fallback) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return fallback;
  return `${parseInt(hex.slice(1,3),16)} ${parseInt(hex.slice(3,5),16)} ${parseInt(hex.slice(5,7),16)}`;
}
const fonts={system:'ui-sans-serif, system-ui, sans-serif',serif:'ui-serif, Georgia, serif',mono:'ui-monospace, monospace'};
const radii={sharp:'0rem',rounded:'0.5rem',pill:'1.25rem'},spacing={compact:'0.85',comfortable:'1',spacious:'1.15'};
export function resolveTheme(game) {
  const theme=game?.theme||{};return { '--runtime-background':rgb(theme.background,'7 17 31'), '--runtime-surface':rgb(theme.surface,'10 23 40'), '--runtime-accent':rgb(theme.accent,'34 211 238'), '--runtime-text':rgb(theme.text,'241 245 249'), '--runtime-muted':rgb(theme.muted,'100 116 139'), '--runtime-border':rgb(theme.border,'255 255 255'), '--runtime-danger':rgb(theme.danger,'248 113 113'), '--runtime-heading-font':fonts[theme.heading_font]||fonts.system, '--runtime-body-font':fonts[theme.body_font]||fonts.system, '--runtime-radius':radii[theme.radius]||radii.rounded, '--runtime-density':spacing[theme.density]||spacing.comfortable, '--runtime-media-radius':theme.media_style==='square'?'0rem':theme.media_style==='cinematic'?'0.75rem':radii.rounded };
}
export const term = (game, key, fallback, translations={}) => translations[`term.${key}`] || game?.terminology?.[key] || fallback;