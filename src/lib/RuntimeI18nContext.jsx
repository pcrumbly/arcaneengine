import { createContext,useContext } from 'react';
const RuntimeI18nContext=createContext({});
export const RuntimeI18nProvider=RuntimeI18nContext.Provider;
export function useRuntimeText(){const translations=useContext(RuntimeI18nContext);return (key,fallback)=>translations?.[key]||fallback;}