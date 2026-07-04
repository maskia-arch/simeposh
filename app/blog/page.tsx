import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getServerT, getServerLocale } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  return {
    title: `${t('blog_title' as any)} & eSIM ${locale === 'de' ? 'Ratgeber' : 'Guides'}`,
    description: t('blog_tagline' as any),
  };
}

export const dynamic = 'force-dynamic';

interface BlogPageProps {
  searchParams?: Promise<{ tab?: string }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const activeTab = params?.tab === 'news' ? 'news' : 'guides';
  const categoryFilter = activeTab === 'guides' ? 'guide' : 'news';

  const locale = await getServerLocale();
  const t = getServerT(locale);
  const supabase = await createClient();

  // Fetch published posts for the active category
  const { data: posts, error } = (await supabase
    .from('posts')
    .select('id, title, slug, excerpt, category, featured_image, published_at, created_at, post_translations(locale, title, slug, excerpt)')
    .eq('is_published', true)
    .eq('status', 'approved')
    .eq('category', categoryFilter)
    .or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(50)) as any;

  if (error) {
    console.error('[BlogPage] Error fetching posts:', error.message);
  }

  const rawPostList = posts ?? [];
  const postList = rawPostList.map((post: any) => {
    const translation = post.post_translations?.find((tr: any) => tr.locale === locale);
    return {
      ...post,
      title: translation?.title || post.title,
      slug: translation?.slug || post.slug,
      excerpt: translation?.excerpt || post.excerpt,
    };
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Premium Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-indigo-950 text-white py-16 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent)] pointer-events-none" />
        <div className="mx-auto max-w-4xl text-center relative z-10">
          <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm mb-3">
            {t('nav_tagline')} Blog
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            {activeTab === 'guides' ? t('blog_title_guides' as any) : t('blog_title_news' as any)}
          </h1>
          <p className="mt-4 text-brand-100 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            {activeTab === 'guides' 
              ? t('blog_desc_guides' as any) 
              : t('blog_desc_news' as any)}
          </p>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-6xl px-4 mt-10">
        {/* Tab switcher */}
        <div className="mb-10 flex justify-center">
          <div className="inline-flex rounded-xl bg-white p-1.5 shadow-sm border border-slate-200">
            <Link
              href="/blog?tab=guides"
              className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'guides'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              📖 {t('blog_category_guide' as any) || 'eSIM Grundlagen'}
            </Link>
            <Link
              href="/blog?tab=news"
              className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'news'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              📡 {t('blog_category_news' as any) || 'News & Updates'}
            </Link>
          </div>
        </div>

        {/* Posts Grid */}
        {postList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-16 text-center text-slate-400 max-w-md mx-auto shadow-sm">
            <p className="text-5xl mb-4">✍️</p>
            <p className="font-semibold text-slate-800 text-lg">
              {t('blog_no_posts' as any) || 'Keine Artikel gefunden.'}
            </p>
            <p className="text-slate-400 text-sm mt-2">
              {t('blog_empty_desc' as any)}
            </p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {postList.map((post: any) => {
              const formattedDate = post.published_at
                ? new Date(post.published_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : new Date(post.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

              return (
                <article
                  key={post.id}
                  className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  {post.featured_image ? (
                    <div className="h-48 w-full overflow-hidden relative">
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className={`absolute bottom-3 left-3 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white ${
                        post.category === 'guide' ? 'bg-brand-600' : 'bg-teal-600'
                      }`}>
                        {post.category === 'guide' 
                          ? (t('blog_category_guide' as any) || 'Grundwissen') 
                          : (t('blog_category_news' as any) || 'News')}
                      </span>
                    </div>
                  ) : (
                    <div className={`h-48 w-full relative flex items-center justify-center text-white overflow-hidden bg-gradient-to-br ${
                      post.category === 'guide' 
                        ? 'from-brand-600 via-brand-700 to-indigo-800' 
                        : 'from-indigo-500 to-brand-500'
                    }`}>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
                      <span className="text-5xl">{post.category === 'guide' ? '📖' : '📡'}</span>
                      <span className="absolute bottom-3 left-3 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                        {post.category === 'guide' 
                          ? (t('blog_category_guide' as any) || 'Grundwissen') 
                          : (t('blog_category_news' as any) || 'News')}
                      </span>
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">{t('blog_published_at' as any) || 'Veröffentlicht am'} {formattedDate}</p>
                      <h2 className="mt-2 text-xl font-bold text-slate-800 line-clamp-2 group-hover:text-brand-600 transition-colors leading-tight">
                        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                      </h2>
                      <p className="mt-2 text-slate-500 text-sm leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>
                    </div>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="mt-6 inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-850 text-sm group"
                    >
                      <span>{t('blog_read_more' as any) || 'Artikel lesen'}</span>
                      <svg className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
