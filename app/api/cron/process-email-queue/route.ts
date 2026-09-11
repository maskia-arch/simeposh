import { NextResponse } from 'next/server';
import { processEmailQueue } from '@/lib/email/queue-processor';
import { getEmailQuotaStatus } from '@/lib/email/quota';
import { getQueueStats } from '@/lib/email/queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleQueue(request: Request) {
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
    const limit = isNaN(limitParam) || limitParam <= 0 ? 100 : Math.min(limitParam, 200);

    const result = await processEmailQueue(limit);
    const quota = await getEmailQuotaStatus();
    const stats = await getQueueStats();

    return NextResponse.json({
      ...result,
      quota,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleQueue(request);
}

export async function POST(request: Request) {
  return handleQueue(request);
}
