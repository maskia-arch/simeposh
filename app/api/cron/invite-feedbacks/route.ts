import { NextResponse } from 'next/server';
import { processFeedbackInvites } from '@/lib/feedback/invites';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleInvite(request: Request) {
  // 1. Secure authorization check (Bearer SHOP_WEBHOOK_SECRET or CRON_SECRET)
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  const webhookSecret = process.env.SHOP_WEBHOOK_SECRET;

  const isAuthorized =
    (!cronSecret && !webhookSecret) ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (webhookSecret && authHeader === `Bearer ${webhookSecret}`);

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '100', 10);
    const limit = isNaN(limitParam) || limitParam <= 0 ? 100 : Math.min(limitParam, 100);

    const result = await processFeedbackInvites(limit);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleInvite(request);
}

export async function POST(request: Request) {
  return handleInvite(request);
}
