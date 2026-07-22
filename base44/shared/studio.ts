const contentTypes = ['LocationDefinition','Connection','NPCDefinition','NPCInstance','NPCPlacement','DialogueGraph','QuestDefinition','ItemDefinition','AbilityDefinition','EncounterDefinition','AttributeDefinition','FormulaDefinition','EffectDefinition','StatusDefinition'];
const reserved = new Set(['id','game_id','content_version','created_date','updated_date','created_by_id']);
const gameFields = ['title','description','terminology','theme','enabled_modules','navigation','header_indicators','character_defaults','rules'];
const clean = (values:any) => Object.fromEntries(Object.entries(values || {}).filter(([key]) => !reserved.has(key)));
async function draftRelease(base44:any, releaseId:string) { const release=await base44.asServiceRole.entities.ContentRelease.get(releaseId); if(release.status!=='draft')throw new Error('Published and retired releases are immutable.'); return release; }
export async function handleStudioAuthoringCommand(base44:any,user:any,body:any){
  if(user.role!=='admin')return Response.json({error:'Forbidden'},{status:403});
  if(body.command==='CREATE_GAME'){
    const key=String(body.key||'').trim().toLowerCase().replace(/[^a-z0-9._-]/g,'-'),title=String(body.title||'').trim(),version=String(body.version||'1.0.0').trim();
    if(!key||!title||!version)return Response.json({error:'Title, key, and initial version are required.'},{status:422});
    if((await base44.asServiceRole.entities.Game.filter({key},'-created_date',1)).length)return Response.json({error:'That game key already exists.'},{status:409});
    const game=await base44.asServiceRole.entities.Game.create({key,title,description:String(body.description||''),status:'draft',terminology:{},theme:{accent:'#22d3ee',surface:'#0a1728',background:'#07111f',text:'#f1f5f9'},enabled_modules:['world','characters','quests','inventory','party','combat','studio','settings'],header_indicators:['character','location','resource','currency'],character_defaults:{attributes:{},resources:{},currency:{},tags:[]},rules:{inventory_capacity:0,starter_stack_quantity:1}});
    const release=await base44.asServiceRole.entities.ContentRelease.create({game_id:game.id,version,status:'draft',notes:'Initial authoring release',validation_summary:{}});
    return Response.json({game,release});
  }
  if(body.command==='SAVE_GAME_CONFIG'){
    const game=await base44.asServiceRole.entities.Game.get(body.gameId),patch=Object.fromEntries(Object.entries(body.values||{}).filter(([key])=>gameFields.includes(key)));
    return Response.json({game:await base44.asServiceRole.entities.Game.update(game.id,patch)});
  }
  if(!contentTypes.includes(body.contentType))return Response.json({error:'Unsupported content type.'},{status:422});
  const release=await base44.asServiceRole.entities.ContentRelease.get(body.releaseId);
  const entity=base44.asServiceRole.entities[body.contentType];
  if(body.command==='GET_STUDIO_CONTENT')return Response.json({release,items:await entity.filter({game_id:release.game_id,content_version:release.version},'created_date',500)});
  if(release.status!=='draft')return Response.json({error:'Published and retired releases are immutable.'},{status:409});
  if(body.command==='SAVE_STUDIO_CONTENT'){
    const values=clean(body.values),key=String(values.key||'').trim();
    if(key){const duplicate=await entity.filter({game_id:release.game_id,content_version:release.version,key},'-created_date',10);if(duplicate.some((item:any)=>item.id!==body.itemId))return Response.json({error:'That content key already exists in this release.'},{status:409});}
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