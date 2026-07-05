import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// This admin endpoint is not publicly available on this deployment.
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
