import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limitParam = searchParams.get('limit');
    const pageParam = searchParams.get('page');

    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Use service role for reading posts. RLS policy also allows public read,
    // but using service client is safe and robust here.
    const supabase = createServiceClient();

    let query = supabase
      .from('posts')
      .select('*', { count: 'exact' })
      .eq('is_published', true)
      .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (category === 'guide' || category === 'news') {
      query = query.eq('category', category);
    }

    const { data: posts, count, error } = await query.range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const totalCount = count ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      posts: posts ?? [],
      pagination: {
        totalCount,
        totalPages,
        page,
        limit,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/blog] Error fetching posts:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
