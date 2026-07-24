import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { handleCombatCommand } from '../../shared/combat.ts';
import { handleAchievementCommand } from '../../shared/achievements.ts';
import { handleSettingsCommand } from '../../shared/settings.ts';
import { handleContentCommand } from '../../shared/content.ts';
import { enforceCommandRate, handleOperationsCommand } from '../../shared/operations.ts';
import { handleDialogueCommand } from '../../shared/dialogue.ts';
import { handlePartyCommand } from '../../shared/party.ts';
import { handleStudioAuthoringCommand } from '../../shared/studio.ts';
import { handleCapabilityCommand } from '../../shared/capabilities.ts';
import { handleSimulationCommand } from '../../shared/simulation.ts';
import { handlePlatformCommand } from '../../shared/platform.ts';
import { getCommandContract, publicCommandContracts, validateCommandPayload, validateCommandResponse } from '../../shared/commandContracts.ts';
import { handleRuntimeCommand } from '../../shared/runtime.ts';
import { beginCommand, completeCommand, failCommand } from '../../shared/idempotency.ts';
import { recordCommandFailure } from '../../shared/reliability.ts';
import { drainOutbox } from '../../shared/eventBus.ts';
import { handleHardeningCommand } from '../../shared/productionHardening.ts';
import { canExecuteCommand } from '../../shared/accessControl.ts';

const domainHandlers:any={
  operations:(base44:any,user:any,body:any,requestId:string)=>['CREATE_CHARACTER_BACKUP','RESTORE_CHARACTER_BACKUP','ROLLBACK_MIGRATION','RETRY_DEAD_LETTER'].includes(body.command)?handleHardeningCommand(base44,user,body,requestId):handleOperationsCommand(base44,user,body),
  platform:(base44:any,user:any,body:any)=>handlePlatformCommand(base44,user,body),
  dialogue:(base44:any,user:any,body:any,requestId:string)=>handleDialogueCommand(base44,user,body,requestId),
  party:(base44:any,user:any,body:any,requestId:string)=>handlePartyCommand(base44,user,body,requestId),
  combat:(base44:any,user:any,body:any,requestId:string)=>handleCombatCommand(base44,user,body,requestId),
  achievements:(base44:any,user:any,body:any,requestId:string)=>handleAchievementCommand(base44,user,body,requestId),
  settings:(base44:any,user:any,body:any)=>handleSettingsCommand(base44,user,body),
  content:(base44:any,user:any,body:any)=>handleContentCommand(base44,user,body),
  studio:(base44:any,user:any,body:any,requestId:string)=>handleStudioAuthoringCommand(base44,user,body,requestId),
  capabilities:(base44:any,user:any,body:any,requestId:string)=>handleCapabilityCommand(base44,user,body,requestId),
  simulation:(base44:any,user:any,body:any,requestId:string)=>handleSimulationCommand(base44,user,body,requestId),
  runtime:(base44:any,user:any,body:any,requestId:string)=>handleRuntimeCommand(base44,user,body,requestId)
};

Deno.serve(async (req) => {
  let base44:any=null,executionContext:any=null,currentUser:any=null,currentCommand='',currentRequestId='';
  try {
    const contentLength=Number(req.headers.get('content-length')||0);if(contentLength>10485760)return Response.json({error:'Request payload is too large.'},{status:413});
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();currentUser=user;
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json(),payloadSize=new TextEncoder().encode(JSON.stringify(body)).length,payloadLimit=['IMPORT_CONTENT_PACKS','PREVIEW_BULK_STUDIO_CONTENT','IMPORT_BULK_STUDIO_CONTENT'].includes(body?.command)?10485760:262144;if(payloadSize>payloadLimit)return Response.json({error:'Request payload is too large.'},{status:413});currentCommand=body?.command||'';
    const contractError = validateCommandPayload(body);
    if (contractError) return Response.json({ error:contractError }, { status:422 });
    const command = body.command;
    const contract:any = getCommandContract(command);
    const requestId = body.requestId || crypto.randomUUID();currentRequestId=requestId;
    if (contract.domain === 'contracts') return Response.json(publicCommandContracts(user.role));
    if(!canExecuteCommand(user,command))return Response.json({error:'Forbidden'},{status:403});
    executionContext=await beginCommand(base44,user,body,requestId);
    if(executionContext.replay)return executionContext.replay;
    await drainOutbox(base44,10);
    const rateLimitResponse = await enforceCommandRate(base44, user, command);
    if(rateLimitResponse){await completeCommand(base44,executionContext,rateLimitResponse);return rateLimitResponse;}
    const handler=domainHandlers[contract.domain];
    if(!handler)return Response.json({error:`No handler registered for ${contract.domain}.`},{status:500});
    const response=await handler(base44,user,body,requestId);
    if(response.ok){const responseBody=await response.clone().json();const responseError=validateCommandResponse(command,responseBody);if(responseError){const invalid=Response.json({error:'Command response violated its contract.',details:responseError},{status:500});if(executionContext?.execution)await completeCommand(base44,executionContext,invalid);else await recordCommandFailure(base44,user.id,command,requestId,responseError,{status_code:500});return invalid;}}
    if(response.status>=500&&!executionContext?.execution)await recordCommandFailure(base44,user.id,command,requestId,(await response.clone().json()).error,{status_code:response.status});
    await completeCommand(base44,executionContext,response);
    await drainOutbox(base44,10);
    return response;
  } catch (error) {
    if(base44&&executionContext?.execution)await failCommand(base44,executionContext,error);else if(base44&&currentUser&&currentCommand)await recordCommandFailure(base44,currentUser.id,currentCommand,currentRequestId,error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});