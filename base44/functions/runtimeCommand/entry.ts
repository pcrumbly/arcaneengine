import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { handleCombatCommand } from '../../shared/combat.ts';
import { handleSettingsCommand } from '../../shared/settings.ts';
import { handleContentCommand } from '../../shared/content.ts';
import { enforceCommandRate, handleOperationsCommand } from '../../shared/operations.ts';
import { handleDialogueCommand } from '../../shared/dialogue.ts';
import { handlePartyCommand } from '../../shared/party.ts';
import { handleStudioAuthoringCommand } from '../../shared/studio.ts';
import { handleCapabilityCommand } from '../../shared/capabilities.ts';
import { handleSimulationCommand } from '../../shared/simulation.ts';
import { handlePlatformCommand } from '../../shared/platform.ts';
import { getCommandContract, publicCommandContracts, validateCommandPayload } from '../../shared/commandContracts.ts';
import { handleRuntimeCommand } from '../../shared/runtime.ts';

const domainHandlers:any={
  operations:(base44:any,user:any,body:any)=>handleOperationsCommand(base44,user,body),
  platform:(base44:any,user:any,body:any)=>handlePlatformCommand(base44,user,body),
  dialogue:(base44:any,user:any,body:any,requestId:string)=>handleDialogueCommand(base44,user,body,requestId),
  party:(base44:any,user:any,body:any,requestId:string)=>handlePartyCommand(base44,user,body,requestId),
  combat:(base44:any,user:any,body:any,requestId:string)=>handleCombatCommand(base44,user,body,requestId),
  settings:(base44:any,user:any,body:any)=>handleSettingsCommand(base44,user,body),
  content:(base44:any,user:any,body:any)=>handleContentCommand(base44,user,body),
  studio:(base44:any,user:any,body:any)=>handleStudioAuthoringCommand(base44,user,body),
  capabilities:(base44:any,user:any,body:any,requestId:string)=>handleCapabilityCommand(base44,user,body,requestId),
  simulation:(base44:any,user:any,body:any,requestId:string)=>handleSimulationCommand(base44,user,body,requestId),
  runtime:(base44:any,user:any,body:any,requestId:string)=>handleRuntimeCommand(base44,user,body,requestId)
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const contractError = validateCommandPayload(body);
    if (contractError) return Response.json({ error:contractError }, { status:422 });
    const command = body.command;
    const contract:any = getCommandContract(command);
    const requestId = body.requestId || crypto.randomUUID();
    if (contract.domain === 'contracts') return Response.json(publicCommandContracts());
    const rateLimitResponse = await enforceCommandRate(base44, user, command);
    if (rateLimitResponse) return rateLimitResponse;
    const handler=domainHandlers[contract.domain];
    if(!handler)return Response.json({error:`No handler registered for ${contract.domain}.`},{status:500});
    return await handler(base44,user,body,requestId);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});