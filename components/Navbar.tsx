'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useTranslation } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { CurrencySwitcher } from '@/components/CurrencySwitcher';
import { useCart } from '@/components/CartProvider';
import { usePathname } from 'next/navigation';
import { HeaderSearch } from '@/components/HeaderSearch';
import type { Destination } from '@/components/HeroSearch';
import { WrenchIcon, CoinsIcon } from '@/components/Icons';

/** Globe (language) | divider | banknote (currency) – Airalo-style controls. */
function LocaleCurrencyControls() {
  return (
    <div className="flex items-center">
      <LanguageSwitcher />
      <span className="mx-0.5 h-5 w-px bg-slate-200" />
      <CurrencySwitcher />
    </div>
  );
}

function CartButton() {
  const { count, toggle } = useCart();
  const { t } = useTranslation();
  const [shouldBounce, setShouldBounce] = useState(false);

  useEffect(() => {
    if (count > 0) {
      setShouldBounce(true);
      const timer = setTimeout(() => setShouldBounce(false), 800);
      return () => clearTimeout(timer);
    }
  }, [count]);

  return (
    <button
      onClick={toggle}
      className={`relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-brand-700 transition-all ${
        shouldBounce ? 'animate-bounce scale-120 text-brand-600' : ''
      }`}
      aria-label={t('cart_title') || 'Cart'}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.51 0 .96-.343 1.087-.835l1.823-6.844a.75.75 0 00-.726-.94H6.106M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

function DashboardDropdown({ t, prefix }: { t: any; prefix: string }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={`flex items-center gap-1 text-slate-600 hover:text-brand-700 transition-colors py-1.5 focus:outline-none font-medium`}
      >
        <span>{t('nav_dashboard')}</span>
        <svg
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl ring-1 ring-black/5 transition-all duration-200 animate-in fade-in slide-in-from-top-1">
          <Link
            href={`${prefix}/dashboard`}
            onClick={() => setOpen(false)}
            className="flex items-start gap-3 rounded-xl p-3 hover:bg-slate-50 transition-colors group"
          >
            <span className="text-2xl mt-0.5 group-hover:scale-110 transition-transform">📱</span>
            <div>
              <p className="font-semibold text-slate-800 group-hover:text-brand-700 transition-colors text-sm">
                {t('nav_my_esims')}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                {t('nav_my_esims_desc')}
              </p>
            </div>
          </Link>
          <Link
            href={`${prefix}/dashboard?tab=cash`}
            onClick={() => setOpen(false)}
            className="flex items-start gap-3 rounded-xl p-3 hover:bg-slate-50 transition-colors group border-t border-slate-100"
          >
            <span className="text-2xl mt-0.5 group-hover:scale-110 transition-transform">💰</span>
            <div>
              <p className="font-semibold text-slate-800 group-hover:text-brand-700 transition-colors text-sm">
                {t('nav_esim_cash' as any) || 'eSIM Cash'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                {t('nav_esim_cash_desc' as any) || 'Umsatz-Cashback & Ränge'}
              </p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const [user, setUser]     = useState<User | null>(null);
  const [menuOpen, setMenu] = useState(false);
  const supabase            = createClient();
  const { t, locale }       = useTranslation();
  const prefix              = locale === 'en' ? '/en' : '';
  const pathname            = usePathname();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => setUser(data.user))
      .catch((err) => {
        console.error('Error fetching current user:', err);
        setUser(null);
      });
  }, [pathname]);

  const cashbackRate = user ? (user as any).cashback_rate ?? 5 : null;

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    fetch('/api/destinations')
      .then((res) => res.json())
      .then((data) => {
        if (data.destinations) setDestinations(data.destinations);
      })
      .catch((err) => console.error('Error loading destinations:', err));
  }, []);

  useEffect(() => {
    // Hide search entirely on checkout, success, callback, and admin routes
    const isExemptRoute =
      pathname.startsWith('/checkout') ||
      pathname.startsWith('/success') ||
      pathname.startsWith('/auth/callback');

    if (isExemptRoute) {
      setShowSearch(false);
      return;
    }

    setShowSearch(true);
  }, [pathname]);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed:', err);
    }
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setUser(null);
    window.location.href = '/';
  }



  return (
    <div className="sticky top-0 z-50 w-full shadow-sm">
      <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-1">
        {/* Logo */}
        <Link href={prefix || '/'} className="flex items-center gap-2 font-bold text-lg shrink-0">
          <img src="/logo.png" alt="PureSim Logo" className="h-10 w-10 object-contain" />
          <span className="text-2xl tracking-tight font-extrabold text-[#1d4ed8]">
            PureSim
          </span>
        </Link>

        {/* Desktop search bar */}
        {showSearch && destinations.length > 0 && (
          <div className="mx-8 hidden max-w-xs flex-1 md:block animate-in fade-in zoom-in-95 duration-200">
            <HeaderSearch destinations={destinations} />
          </div>
        )}

        {/* Desktop nav */}
        <div className="hidden items-center gap-4 text-sm font-medium md:flex">
          <Link href={`${prefix}/blog`} className="text-slate-600 hover:text-brand-700 transition-colors">
            {t('nav_blog' as any) || 'Blog'}
          </Link>
          <Link href={`${prefix}/tariffs`} className="text-slate-600 hover:text-brand-700 transition-colors">
            {t('nav_tariffs')}
          </Link>
          <Link href={`${prefix}/topup`} className="text-slate-600 hover:text-brand-700 transition-colors">
            {t('nav_topup')}
          </Link>
          {user ? (
            <>
              <Link
                href={`${prefix}/dashboard`}
                className="btn-primary !h-12 !px-5"
              >
                {t('nav_dashboard')}
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-100 px-4 text-base font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                {t('nav_logout')}
              </button>
            </>
          ) : (
            <>
              <Link
                href={`${prefix}/login`}
                className="btn-primary !h-12 !px-5"
              >
                {t('nav_login')}
              </Link>
            </>
          )}
          <CartButton />
          <LocaleCurrencyControls />
        </div>

        {/* Mobile: cart + lang/currency + hamburger */}
        <div className="flex items-center gap-1 md:hidden">
          {showSearch && destinations.length > 0 && (
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className={`rounded-lg p-2 transition-colors ${
                mobileSearchOpen ? 'bg-slate-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-brand-700'
              }`}
              aria-label={t('search_aria_label' as any) || 'Search'}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          )}
          <CartButton />
          <LocaleCurrencyControls />
          <button
            className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
            onClick={() => setMenu(!menuOpen)}
            aria-label={t('nav_menu' as any) || 'Menu'}
            aria-expanded={menuOpen}
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
            <Link href={`${prefix}/blog`} onClick={() => setMenu(false)} className="text-slate-700">{t('nav_blog' as any) || 'Blog'}</Link>
            <Link href={`${prefix}/tariffs`} onClick={() => setMenu(false)} className="text-slate-700">{t('nav_tariffs')}</Link>
            <Link href={`${prefix}/topup`}   onClick={() => setMenu(false)} className="text-slate-700">{t('nav_topup')}</Link>
            {user ? (
              <>
 
                <div className="flex flex-col gap-2 border-l-2 border-slate-100 pl-3">
                  <Link href={`${prefix}/dashboard`} onClick={() => setMenu(false)} className="text-slate-800 font-bold hover:text-brand-700 transition-colors text-sm">
                    {t('nav_dashboard')}
                  </Link>
                  <Link href={`${prefix}/dashboard`} onClick={() => setMenu(false)} className="text-slate-700 flex items-center gap-2 hover:text-brand-700 transition-colors font-medium">
                    📱 {t('nav_my_esims')}
                  </Link>
                  <Link href={`${prefix}/dashboard?tab=cash`} onClick={() => setMenu(false)} className="text-slate-700 flex items-center gap-2 hover:text-brand-700 transition-colors font-medium">
                    💰 {t('nav_esim_cash' as any) || 'eSIM Cash'}
                  </Link>
                </div>
                <button onClick={handleLogout} className="text-left text-red-600">{t('nav_logout')}</button>
              </>
            ) : (
              <>
                <Link href={`${prefix}/login`}    onClick={() => setMenu(false)} className="text-slate-700 font-semibold">{t('nav_login')}</Link>
              </>
            )}

            <div className="pt-2 border-t border-slate-100">
              <a
                href="https://t.me/autoacts"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenu(false)}
                className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-xs"
              >
                <svg className="h-5 w-5 shrink-0 text-[#24A1DE]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
                <span>Kontakt über Telegram</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Mobile search bar overlay */}
      {mobileSearchOpen && showSearch && destinations.length > 0 && (
        <div className="border-t border-slate-100 bg-white px-4 py-2.5 shadow-md md:hidden animate-in slide-in-from-top duration-150">
          <HeaderSearch 
            destinations={destinations}
            placeholder={t('tariffs_search')}
            onSearchClose={() => setMobileSearchOpen(false)}
          />
        </div>
      )}
    </nav>

      {/* Announcement Bar under the Header */}
      <Link
        href={user ? `${prefix}/dashboard?tab=cash` : `${prefix}/blog/${locale === 'en' ? 'puresim-esim-cash-cashback-program-save-on-every-plan-purchase' : 'puresim-esim-cash-cashback-programm'}`}
        className="w-full bg-gradient-to-r from-brand-600 via-brand-700 to-brand-800 text-white text-center py-2 px-4 text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
      >
        <CoinsIcon size={16} />
        {user ? (
          <span>
            {t('announcement_user' as any, { rate: cashbackRate ?? 5 })}
          </span>
        ) : (
          <span>
            {t('announcement_guest' as any)}
          </span>
        )}
      </Link>
    </div>
  );
}
