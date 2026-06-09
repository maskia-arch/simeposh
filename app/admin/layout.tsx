import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/auth';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s | Admin' } };

const NAV = [
  { href: '/admin',          icon: '📊', label: 'Übersicht'  },
  { href: '/admin/sync',     icon: '🔄', label: 'Produkt-Sync' },
  { href: '/admin/tariffs',  icon: '📦', label: 'Tarife'     },
  { href: '/admin/orders',   icon: '🧾', label: 'Bestellungen' },
  { href: '/admin/crypto',   icon: '🪙', label: 'Krypto'      },
  { href: '/admin/settings', icon: '⚙️', label: 'Einstellungen' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Admin</p>
          <p className="mt-0.5 truncate text-sm font-medium text-slate-700">{user.email}</p>
        </div>
        <nav className="flex-1 py-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-100 px-5 py-4">
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-brand-600 transition-colors">
            ← Zur Website
          </Link>
        </div>
      </aside>

      {/* Mobile top-bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <p className="font-bold text-brand-700">⚙️ Admin</p>
        <div className="flex gap-3 overflow-x-auto text-xs font-medium">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap text-slate-600 hover:text-brand-700">
              {item.icon} {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
