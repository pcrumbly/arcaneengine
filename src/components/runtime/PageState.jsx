import { AlertCircle, LoaderCircle, SearchX } from 'lucide-react';
export default function PageState({title,description,kind='loading'}){
  const Icon=kind==='loading'?LoaderCircle:kind==='error'?AlertCircle:SearchX;
  return <div className="grid min-h-[calc(100vh-9rem)] place-items-center p-6"><div role={kind==='error'?'alert':'status'} className="w-full max-w-md rounded-lg border border-white/10 bg-runtime-surface p-6 text-center"><Icon size={24} className={`mx-auto ${kind==='loading'?'animate-spin text-runtime-accent':kind==='error'?'text-red-300':'text-slate-400'}`}/><h1 className="mt-4 text-lg font-semibold">{title}</h1>{description&&<p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>}</div></div>;
}