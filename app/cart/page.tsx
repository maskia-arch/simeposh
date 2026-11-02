import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { verifyJwt } from '@/lib/auth/jwt';
import { query } from '@/lib/db';
import { buildAlternates } from '@/lib/seo';
import { CartPageClient } from './CartPageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const isCancelled = params?.cancelled === '1' || params?.cancelled === 'true';
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const pageTitle = isCancelled
    ? (t('cart_cancelled_title' as any) || (locale === 'de' ? 'Zahlung abgebrochen' : 'Payment cancelled'))
    : (t('cart_title' as any) || (locale === 'de' ? 'Warenkorb' : 'Cart'));

  return {
    title: { absolute: `${pageTitle} | PureSim` },
    robots: {
      index: false,
      follow: false,
    },
    alternates: buildAlternates(locale, {
      dePath: 'cart',
      enPath: 'cart',
    }),
  };
}

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const params = await searchParams;
  const isCancelled = params?.cancelled === '1' || params?.cancelled === 'true';

  let initialUser: any = null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (token) {
      const decoded = await verifyJwt(token);
      if (decoded && decoded.id) {
        const { rows } = await query(
          'SELECT id, email, full_name, is_verified FROM public.users WHERE id = $1 AND deleted_at IS NULL',
          [decoded.id]
        );
        if (rows.length > 0 && rows[0].is_verified) {
          initialUser = {
            id: rows[0].id,
            email: rows[0].email,
            is_verified: true,
            user_metadata: { full_name: rows[0].full_name || '' },
          };
        }
      }
    }
  } catch (err) {
    console.error('[CartPage] initialUser resolution error:', err);
  }

  return (
    <CartPageClient
      initialCancelled={isCancelled}
      initialUser={initialUser}
      initialEmail={initialUser?.email || ''}
    />
  );
}
