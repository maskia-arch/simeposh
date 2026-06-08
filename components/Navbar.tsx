'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useTranslation } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Navbar() {
  const [user, setUser]     = useState<User | null>(null);
  const [menuOpen, setMenu] = useState(false);
  const supabase            = createClient();
  const { t }               = useTranslation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user ?? null),
    );
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-700 text-lg">
          📡 {t('nav_tagline')}
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-4 text-sm font-medium md:flex">
          <Link href="/tariffs" className="text-slate-600 hover:text-brand-700 transition-colors">
            {t('nav_tariffs')}
          </Link>
          <Link href="/topup" className="text-slate-600 hover:text-brand-700 transition-colors">
            {t('nav_topup')}
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-slate-600 hover:text-brand-700 transition-colors">
                {t('nav_dashboard')}
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-lg bg-slate-100 px-4 py-2 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                {t('nav_logout')}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-brand-700 transition-colors">
                {t('nav_login')}
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 transition-colors"
              >
                {t('nav_register')}
              </Link>
            </>
          )}
          <LanguageSwitcher />
        </div>

        {/* Mobile: lang switcher + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <button
            className="flex flex-col gap-1.5"
            onClick={() => setMenu(!menuOpen)}
            aria-label="Menu"
          >
            <span className={`block h-0.5 w-6 bg-slate-700 transition-all ${menuOpen ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`block h-0.5 w-6 bg-slate-700 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 w-6 bg-slate-700 transition-all ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-slate-100 bg-white px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-3 pt-3 text-sm font-medium">
            <Link href="/tariffs" onClick={() => setMenu(false)} className="text-slate-700">{t('nav_tariffs')}</Link>
            <Link href="/topup"   onClick={() => setMenu(false)} className="text-slate-700">{t('nav_topup')}</Link>
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setMenu(false)} className="text-slate-700">{t('nav_dashboard')}</Link>
                <button onClick={handleLogout} className="text-left text-red-600">{t('nav_logout')}</button>
              </>
            ) : (
              <>
                <Link href="/login"    onClick={() => setMenu(false)} className="text-slate-700">{t('nav_login')}</Link>
                <Link href="/register" onClick={() => setMenu(false)} className="text-brand-700 font-semibold">{t('nav_register')}</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
