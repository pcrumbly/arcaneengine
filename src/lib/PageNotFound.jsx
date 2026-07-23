import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';


export default function PageNotFound({}) {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await base44.auth.me();
                return { user, isAuthenticated: true };
            } catch (error) {
                return { user: null, isAuthenticated: false };
            }
        }
    });
    
    return (
        <main className="runtime-themed grid min-h-screen place-items-center bg-runtime p-6 text-runtime-text">
            <section className="w-full max-w-lg rounded-xl border border-white/10 bg-runtime-surface p-6 text-center sm:p-8">
                <p className="text-xs uppercase tracking-[.22em] text-runtime-accent">Navigation / 404</p>
                <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
                <p className="mt-3 text-sm leading-6 text-slate-400">The page <span className="font-medium text-slate-200">“{pageName || '/'}”</span> does not exist in this application.</p>
                {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && <div className="mt-6 flex gap-3 rounded-lg border border-amber-400/20 bg-amber-400/10 p-4 text-left"><AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-300"/><div><p className="text-sm font-medium text-amber-100">Administrator note</p><p className="mt-1 text-xs leading-5 text-amber-100/70">Confirm the route is enabled in the current game configuration and application router.</p></div></div>}
                <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-md bg-runtime-accent px-4 py-2 text-sm font-semibold text-slate-950"><Home size={16}/>Return to runtime</Link>
            </section>
        </main>
    )
}