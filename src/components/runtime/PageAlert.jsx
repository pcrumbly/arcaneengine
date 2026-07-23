import { AlertCircle } from 'lucide-react';
export default function PageAlert({message}){
  if(!message)return null;
  return <div role="alert" className="flex items-start gap-2 rounded-md border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200"><AlertCircle size={16} className="mt-0.5 shrink-0"/><span>{message}</span></div>;
}