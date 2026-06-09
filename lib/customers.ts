/**
 * Customer resolution for checkout.
 *
 * - Logged-in users: ensure a public.users row exists (the orders.user_id FK
 *   points there) and return their id. This fixes the FK violation that occurs
 *   when an auth user has no matching public.users row yet.
 * - Guests: return null. The order is linked by customer_email and is later
 *   "claimed" automatically when the visitor registers with that email
 *   (see the dashboard lazy-claim), so guest purchases are never lost.
 */
import type { createServiceClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

export async function resolveCustomer(
  service: ReturnType<typeof createServiceClient>,
  user:    User | null,
  email:   string,
): Promise<string | null> {
  if (!user) return null;

  try {
    await service
      .from('users')
      .upsert(
        {
          id:        user.id,
          email:     user.email ?? email,
          full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
        },
        { onConflict: 'id' },
      );
  } catch (err) {
    // Non-fatal: if the profile upsert fails we fall back to a guest order
    // (linked by email) so checkout still succeeds.
    console.error('[customers] profile upsert failed:', err);
    return null;
  }

  return user.id;
}

/**
 * Claim any guest orders that share this user's email but have no user_id yet.
 * Called when the customer views their dashboard after registering.
 */
export async function claimGuestOrders(
  service: ReturnType<typeof createServiceClient>,
  userId:  string,
  email:   string,
): Promise<void> {
  if (!email) return;
  const cleanEmail = email.trim().toLowerCase();
  try {
    // 1. Claim guest orders
    await service
      .from('orders')
      .update({ user_id: userId })
      .is('user_id', null)
      .eq('customer_email', cleanEmail);

    // 2. Claim guest eSIM Cash accounts
    await (service
      .from('esim_cash_accounts')
      .update({ user_id: userId } as any) as any)
      .is('user_id', null)
      .eq('email', cleanEmail);
  } catch (err) {
    console.error('[customers] claimGuestOrders failed:', err);
  }
}
