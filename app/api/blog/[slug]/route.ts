import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!post) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[GET /api/blog/${request.url}] Error fetching post:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
