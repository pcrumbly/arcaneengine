export async function recordCommandFailure(base44:any,userId:string,command:string,requestId:string,error:any,metadata:any={}){
  try{await base44.asServiceRole.entities.OperationalEvent.create({user_id:userId,category:'command_failure',severity:'critical',command,message:`${command} failed.`,metadata:{request_id:requestId,error:String(error?.message||error||'Unknown error'),...metadata},occurred_at:new Date().toISOString()});}catch{}
}
export async function recordCommandRecovery(base44:any,execution:any,kind='lease_recovered'){
  try{await base44.asServiceRole.entities.OperationalEvent.create({user_id:execution.actor_user_id,category:'command_recovery',severity:'warning',command:execution.command,message:`Recovered ${execution.command} after an interrupted attempt.`,metadata:{request_id:execution.request_id,aggregate_id:execution.aggregate_id||null,kind},occurred_at:new Date().toISOString()});}catch{}
}
export function summarizeCommandHealth(executions:any[]){
  const now=Date.now(),processing=executions.filter(row=>row.status==='processing'),failed=executions.filter(row=>row.status==='failed');
  return {processing:processing.filter(row=>new Date(row.lease_expires_at||0).getTime()>now).length,stale:processing.filter(row=>new Date(row.lease_expires_at||0).getTime()<=now).length,failed:failed.length,completed:executions.filter(row=>row.status==='completed').length};
}