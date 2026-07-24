import { base44 } from '@/api/base44Client';

let contractsPromise;
const inFlightReads = new Map();
const readCommands = new Set(['GET_STATE','GET_INVENTORY','GET_QUESTS','GET_OPERATIONS','GET_NOTIFICATIONS','GET_COMBAT','GET_PARTY','GET_SETTINGS','GET_SKILLS','GET_WORLD','GET_JOURNAL','GET_PRESENTATION','GET_ACCOUNT','GET_RUNTIME_MODULE','GET_NPC_INTERACTION','GET_CHARACTER_PROFILE','STUDIO_OVERVIEW','GET_STUDIO_CONTENT','GET_CONTENT_CHANGE_HISTORY','GET_EFFECTIVE_CONTENT','GET_CONTENT_SCHEMA_REGISTRY','GET_CONTENT_DEPENDENCIES','EXPORT_CONTENT_PACKS','PREVIEW_BULK_STUDIO_CONTENT','GET_SIMULATION','GET_ADMIN_USERS','GET_ACHIEVEMENTS','GET_CONTEXTUAL_ACTIONS']);

const matchesType = (value, type) => type === 'array'
  ? Array.isArray(value)
  : type === 'object'
    ? value !== null && typeof value === 'object' && !Array.isArray(value)
    : typeof value === type;

const loadContracts = () => {
  contractsPromise ||= base44.functions.invoke('runtimeCommand', { command: 'GET_COMMAND_CONTRACTS' })
    .then(({ data }) => new Map(data.commands.map((contract) => [contract.command, contract])));
  return contractsPromise;
};

export async function invokeRuntimeCommand(payload) {
  if (payload?.command !== 'GET_COMMAND_CONTRACTS') {
    const contracts = await loadContracts();
    const contract = contracts.get(payload?.command);
    if (!contract) throw new Error(`Unknown command: ${payload?.command || 'missing command'}.`);
    for (const field of contract.request.required) {
      const value = payload[field];
      if (value === undefined || value === null || value === '') throw new Error(`${field} is required for ${payload.command}.`);
      const type = contract.request.properties[field]?.type;
      if (type && !matchesType(value, type)) throw new Error(`${field} must be a ${type}.`);
    }
  }
  const request = payload?.requestId ? payload : { ...payload, requestId: crypto.randomUUID() };
  if (!readCommands.has(payload?.command)) return base44.functions.invoke('runtimeCommand', request);
  const readKey = JSON.stringify(payload);
  if (inFlightReads.has(readKey)) return inFlightReads.get(readKey);
  const pending = base44.functions.invoke('runtimeCommand', request).finally(() => inFlightReads.delete(readKey));
  inFlightReads.set(readKey, pending);
  return pending;
}