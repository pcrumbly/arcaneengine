import { base44 } from '@/api/base44Client';

export function invokeRuntimeCommand(payload) {
  return base44.functions.invoke('runtimeCommand', payload);
}