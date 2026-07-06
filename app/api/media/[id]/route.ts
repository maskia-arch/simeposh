import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const { rows } = await query(
      'SELECT filename, mime_type, data FROM public.media WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const { filename, mime_type, data } = rows[0];

    const headers = new Headers();
    headers.set('Content-Type', mime_type);
    headers.set('Content-Length', data.length.toString());
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Content-Disposition', `inline; filename="${filename}"`);

    return new NextResponse(data, { headers });
  } catch (err: any) {
    console.error('[Media API Error]', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
