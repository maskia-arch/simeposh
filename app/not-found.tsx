import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center px-4 py-16 font-sans text-slate-100">
      <div className="max-w-md mx-auto space-y-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-brand-600/20 border border-brand-500/30 text-brand-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">404 - Seite nicht gefunden</h1>
          <p className="text-sm text-slate-400">
            Die angeforderte Einrichtungsseite oder Webshop-Seite ist unter dieser Adresse nicht erreichbar.
          </p>
        </div>

        <div className="pt-2">
          <a
            href="https://puresim.net"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition-all cursor-pointer"
          >
            <span>Zum PureSim Webshop</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>
    </main>
  );
}
