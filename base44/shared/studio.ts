import { createBasePack, resolveContentPackLayers } from './contentPacks.ts';
import { requireGamePermission } from './authorization.ts';
import { validateCalendarConfig,validateSimulationConfig } from './calendar.ts';
const contentTypes = ['TagDefinition','InteractionRuleDefinition','EnvironmentalFeatureDefinition','ItemRecipeDefinition','WeatherDefinition','WorldEventDefinition','FactionDefinition','FactionOperationDefinition','CrimeDefinition','KnowledgeDefinition','RumorDefinition','LocationDefinition','Connection','NPCDefinition','NPCInstance','NPCPlacement','DialogueGraph','QuestDefinition','AchievementDefinition','ItemDefinition','AbilityDefinition','EncounterDefinition','AttributeDefinition','SkillDefinition','FormulaDefinition','EffectDefinition','StatusDefinition','LocalizationEntry','RuleExtensionDefinition','RuntimeModuleDefinition'];
const reserved = new Set(['id','game_id','content_version','created_date','updated_date','created_by_id']);
const gameFields = ['title','description','terminology','theme','enabled_modules','navigation','header_indicators','character_defaults','calendar','simulation','rules'];
const clean = (values:any) => Object.fromEntries(Object.entries(values || {}).filter(([key]) => !reserved.has(key)));
async function draftRelease(base44:any, releaseId:string) { const release=await base44.asServiceRole.entities.ContentRelease.get(releaseId); if(release.status!=='draft')throw new Error('Published and retired releases are immutable.'); return release; }
export async function handleStudioAuthoringCommand(base44:any,user:any,body:any){
  if(user.role!=='admin')return Response.json({error:'Forbidden'},{status:403});
  if(body.command==='CREATE_GAME'){
    const key=String(body.key||'').trim().toLowerCase().replace(/[^a-z0-9._-]/g,'-'),title=String(body.title||'').trim(),version=String(body.version||'1.0.0').trim();
    if(!key||!title||!version)return Response.json({error:'Title, key, and initial version are required.'},{status:422});
    if((await base44.asServiceRole.entities.Game.filter({key},'-created_date',1)).length)return Response.json({error:'That game key already exists.'},{status:409});
    const game=await base44.asServiceRole.entities.Game.create({key,title,description:String(body.description||''),status:'draft',terminology:{},theme:{accent:'#22d3ee',surface:'#0a1728',background:'#07111f',text:'#f1f5f9',muted:'#64748b',border:'#ffffff',danger:'#f87171',heading_font:'system',body_font:'system',density:'comfortable',radius:'rounded',media_style:'rounded'},enabled_modules:['world','characters','quests','achievements','journal','inventory','skills','party','combat','messages','studio','settings','account'],header_indicators:['character','location','resource','currency'],character_defaults:{attributes:{},resources:{},currency:{},tags:[]},calendar:{name:'World Calendar',minutes_per_hour:60,hours_per_day:24,weekdays:[{key:'day-1',name:'Day 1'},{key:'day-2',name:'Day 2'},{key:'day-3',name:'Day 3'},{key:'day-4',name:'Day 4'},{key:'day-5',name:'Day 5'},{key:'day-6',name:'Day 6'},{key:'day-7',name:'Day 7'}],months:Array.from({length:12},(_,index)=>({key:`month-${index+1}`,name:`Month ${index+1}`,days:30})),epoch:{year:1,month:1,day:1,hour:8,minute:0},format:'{weekday}, {month} {day}, Year {year} · {hour}:{minute}'},simulation:{local_tick_minutes:15,regional_tick_minutes:60,global_tick_minutes:360,max_fast_forward_minutes:1440,fast_forward_options:[{label:'Wait 1 hour',minutes:60},{label:'Rest 8 hours',minutes:480,rest:true},{label:'Wait 1 day',minutes:1440}]},rules:{inventory_capacity:0,starter_stack_quantity:1}});
    await base44.asServiceRole.entities.GameMembership.create({game_id:game.id,user_id:user.id,role:'owner',status:'active'});
    const pack=await createBasePack(base44,game,version),release=await base44.asServiceRole.entities.ContentRelease.create({game_id:game.id,version,content_pack_ids:[pack.id],status:'draft',notes:'Initial authoring release',validation_summary:{}});
    return Response.json({game,pack,release});
  }
  if(body.command==='SAVE_GAME_CONFIG'){
    const game=await base44.asServiceRole.entities.Game.get(body.gameId),access=await requireGamePermission(base44,user,game.id,'studio:write');if(access)return access;
    const patch=Object.fromEntries(Object.entries(body.values||{}).filter(([key])=>gameFields.includes(key))),calendarIssue=validateCalendarConfig(patch.calendar),simulationIssue=validateSimulationConfig(patch.simulation);if(calendarIssue||simulationIssue)return Response.json({error:calendarIssue||simulationIssue},{status:422});
    return Response.json({game:await base44.asServiceRole.entities.Game.update(game.id,patch)});
  }
  if(body.command==='CREATE_CONTENT_PACK'){const game=await base44.asServiceRole.entities.Game.get(body.gameId),access=await requireGamePermission(base44,user,game.id,'content:write');if(access)return access;const key=String(body.values?.key||'').trim(),name=String(body.values?.name||'').trim(),version=String(body.values?.version||'').trim();if(!key||!name||!version)return Response.json({error:'Pack name, key, and version are required.'},{status:422});const duplicate=await base44.asServiceRole.entities.ContentPack.filter({game_id:game.id,key},'-created_date',1);if(duplicate.length)return Response.json({error:'That content pack key already exists.'},{status:409});const dependencies=await resolveContentPackLayers(base44,game.id,body.values?.dependencyPackIds||[]),pack=await base44.asServiceRole.entities.ContentPack.create({game_id:game.id,key,name,description:String(body.values?.description||''),version,status:'draft',dependency_pack_ids:dependencies.map((item:any)=>item.id),module_keys:body.values?.moduleKeys||[]});return Response.json({pack});}
  if(!contentTypes.includes(body.contentType))return Response.json({error:'Unsupported content type.'},{status:422});
  const release=await base44.asServiceRole.entities.ContentRelease.get(body.releaseId);
  const permission=body.command==='GET_STUDIO_CONTENT'?'content:read':'content:write',access=await requireGamePermission(base44,user,release.game_id,permission);if(access)return access;
  const entity=base44.asServiceRole.entities[body.contentType];
  if(body.command==='GET_STUDIO_CONTENT')return Response.json({release,items:await entity.filter({game_id:release.game_id,content_version:release.version},'created_date',500)});
  if(release.status!=='draft')return Response.json({error:'Published and retired releases are immutable.'},{status:409});
  if(body.command==='SAVE_STUDIO_CONTENT'){
    const values=clean(body.values),key=String(values.key||'').trim();
    if(key){const uniqueQuery:any={game_id:release.game_id,content_version:release.version,key};if(body.contentType==='LocalizationEntry')uniqueQuery.locale=String(values.locale||'').trim();const duplicate=await entity.filter(uniqueQuery,'-created_date',10);if(duplicate.some((item:any)=>item.id!==body.itemId))return Response.json({error:'That content key already exists in this release.'},{status:409});}
    const payload={...values,game_id:release.game_id,content_version:release.version};
    const item=body.itemId?await entity.update(body.itemId,payload):await entity.create(payload);
    return Response.json({item});
  }
  if(body.command==='DELETE_STUDIO_CONTENT'){
    const item=await entity.get(body.itemId);if(item.game_id!==release.game_id||item.content_version!==release.version)return Response.json({error:'Content ownership could not be verified.'},{status:403});
    await entity.delete(item.id);return Response.json({deleted:true});
  }
  return Response.json({error:'Unknown studio command.'},{status:400});
}