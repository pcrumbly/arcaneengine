import { base44 } from '@/api/base44Client';

let contractsPromise;

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
  return base44.functions.invoke('runtimeCommand', payload);
}