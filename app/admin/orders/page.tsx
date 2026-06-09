import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { OrdersAdminTable } from './OrdersAdminTable';

export const metadata: Metadata = { title: 'Bestellungen' };
export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  await requireAdmin();
  const db = createServiceClient();

  const { data: orders } = await db
    .from('orders')
    .select(`
      id, status, order_type, customer_email, customer_name,
      amount_eur, iccid, top_up_iccid, error_message,
      sellauth_order_id, payment_confirmed_at, created_at, updated_at,
      checkout_ref,
      tariffs(name, country_name, flag_emoji, data_gb, validity_days)
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Bestellungen</h1>
        <p className="mt-1 text-sm text-slate-500">
          {orders?.length ?? 0} Bestellungen (neueste zuerst, max. 200)
        </p>
      </div>

      <OrdersAdminTable orders={(orders ?? []) as any} />
    </div>
  );
}
