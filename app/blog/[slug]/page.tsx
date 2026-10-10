import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { query } from '@/lib/db';
import { getServerT, getServerLocale } from '@/lib/i18n/server';
import { getOrCreateTranslation } from '@/lib/blog/translation';
import { buildAlternates, BASE_URL, getOgLocale, getOgLocaleAlternates } from '@/lib/seo';
import type { LocaleCode } from '@/lib/i18n/config';

interface PostResolution {
  post: any;
  currentSlug: string;
  localizedSlugs: Partial<Record<LocaleCode, string>>;
  shouldRedirect: boolean;
  redirectUrl?: string;
  resolvedData: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    category: string;
    featured_image: string | null;
    published_at: string | null;
    created_at: string;
  };
}

async function getPostAndTranslation(slug: string, locale: LocaleCode): Promise<PostResolution | null> {
  // 1. Try to find the post where slug matches the main posts table
  let postRes = await query('SELECT * FROM posts WHERE slug = $1 AND is_published = true AND status = $2', [slug, 'approved']);
  let post = postRes.rows[0];

  // 2. If not found, try to find it by slug in post_translations
  if (!post) {
    let transRes = await query('SELECT post_id, slug, locale FROM post_translations WHERE slug = $1', [slug]);
    let trans = transRes.rows[0];
    if (trans) {
      let mainRes = await query('SELECT * FROM posts WHERE id = $1 AND is_published = true AND status = $2', [trans.post_id, 'approved']);
      post = mainRes.rows[0];
    }
  }

  if (!post) return null;

  // 3. Fetch all translations for this post
  const transAllRes = await query('SELECT locale, title, slug, excerpt, content FROM post_translations WHERE post_id = $1', [post.id]);
  const allTranslations: Record<string, any> = {};
  transAllRes.rows.forEach((r: any) => {
    allTranslations[r.locale] = r;
  });

  // If translation missing for current locale, fallback or generate
  let currentTrans = allTranslations[locale];
  if (!currentTrans && locale !== 'de') {
    try {
      currentTrans = await getOrCreateTranslation(post.id, locale);
      if (currentTrans) allTranslations[locale] = currentTrans;
    } catch (err) {
      console.error(`[Translation Fallback] Failed to translate post ${post.id} to ${locale}:`, err);
    }
  }

  const localizedSlugs: Partial<Record<LocaleCode, string>> = {
    de: post.slug,
  };

  Object.entries(allTranslations).forEach(([loc, tr]) => {
    if (tr?.slug) {
      localizedSlugs[loc as LocaleCode] = tr.slug;
    }
  });

  const expectedSlug = locale === 'de' ? post.slug : (localizedSlugs[locale] || post.slug);

  // Check whether request needs canonical language URL redirect
  let shouldRedirect = false;
  let redirectUrl: string | undefined;

  if (slug !== expectedSlug) {
    shouldRedirect = true;
    const prefix = locale === 'de' ? '' : `/${locale}`;
    redirectUrl = `${prefix}/blog/${expectedSlug}`;
  }

  const isDe = locale === 'de';
  const resolvedData = {
    title: isDe ? post.title : (currentTrans?.title || post.title),
    slug: expectedSlug,
    excerpt: isDe ? post.excerpt : (currentTrans?.excerpt || post.excerpt),
    content: isDe ? post.content : (currentTrans?.content || post.content),
    category: post.category,
    featured_image: post.featured_image,
    published_at: post.published_at,
    created_at: post.created_at,
  };

  return {
    post,
    currentSlug: expectedSlug,
    localizedSlugs,
    shouldRedirect,
    redirectUrl,
    resolvedData,
  };
}

export const dynamic = 'force-dynamic';

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

// Custom simple markdown parser for rendering body content
function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  if (markdown.trim().startsWith('<') && markdown.includes('</')) {
    return markdown;
  }

  const lines = markdown.split(/\r?\n/);
  let inList = false;
  
  const processedLines = lines.map(line => {
    const trimmed = line.trim();

    // H3
    if (trimmed.startsWith('### ')) {
      const heading = `<h3 class="text-lg md:text-xl font-bold text-slate-800 mt-8 mb-3 tracking-tight">${trimmed.slice(4)}</h3>`;
      if (inList) {
        inList = false;
        return '</ul>\n' + heading;
      }
      return heading;
    }
    // H2
    if (trimmed.startsWith('## ')) {
      const heading = `<h2 class="text-xl md:text-2xl font-bold text-slate-900 mt-10 mb-4 tracking-tight border-b border-slate-100 pb-2">${trimmed.slice(3)}</h2>`;
      if (inList) {
        inList = false;
        return '</ul>\n' + heading;
      }
      return heading;
    }
    // H1
    if (trimmed.startsWith('# ')) {
      const heading = `<h1 class="text-2xl md:text-3xl font-extrabold text-slate-950 mt-12 mb-6 tracking-tight">${trimmed.slice(2)}</h1>`;
      if (inList) {
        inList = false;
        return '</ul>\n' + heading;
      }
      return heading;
    }

    // List items
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.slice(2);
      const li = `<li class="ml-6 list-disc text-slate-700 leading-relaxed mb-2">${itemText}</li>`;
      if (!inList) {
        inList = true;
        return '<ul class="my-4 space-y-1">\n' + li;
      }
      return li;
    }

    // Empty line
    if (!trimmed) {
      if (inList) {
        inList = false;
        return '</ul>';
      }
      return '';
    }

    // Standard paragraph
    if (inList) {
      inList = false;
      return '</ul>\n<p class="text-slate-700 leading-relaxed mb-5 text-sm sm:text-base">' + trimmed + '</p>';
    }
    return '<p class="text-slate-700 leading-relaxed mb-5 text-sm sm:text-base">' + trimmed + '</p>';
  });

  if (inList) {
    processedLines.push('</ul>');
  }

  let html = processedLines.join('\n');

  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.*?)`/g, '<code class="bg-slate-100 rounded px-1.5 py-0.5 text-sm font-mono text-indigo-600">$1</code>');
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-brand-600 hover:text-brand-750 hover:underline font-semibold" target="_blank" rel="noopener noreferrer">$1</a>');

  return html;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getServerLocale();
  const res = await getPostAndTranslation(slug, locale);

  if (!res) {
    return { title: 'Artikel nicht gefunden' };
  }

  if (res.shouldRedirect && res.redirectUrl) {
    redirect(res.redirectUrl);
  }

  const { resolvedData, localizedSlugs } = res;
  const isDe = locale === 'de';

  const localizedPaths: Partial<Record<LocaleCode, string>> = {};
  Object.entries(localizedSlugs).forEach(([loc, sl]) => {
    if (sl) localizedPaths[loc as LocaleCode] = `blog/${sl}`;
  });

  const prefix = isDe ? '' : `/${locale}`;

  return {
    title: resolvedData.title,
    description: resolvedData.excerpt || (isDe ? 'Lies den vollständigen Artikel in unserem Blog.' : 'Read the full article on our blog.'),
    alternates: buildAlternates(locale, {
      dePath: `blog/${localizedSlugs.de}`,
      enPath: `blog/${localizedSlugs.en || localizedSlugs.de}`,
      localizedPaths,
    }),
    openGraph: {
      title: resolvedData.title,
      description: resolvedData.excerpt,
      locale: getOgLocale(locale),
      alternateLocale: getOgLocaleAlternates(locale),
      url: `${BASE_URL}${prefix}/blog/${resolvedData.slug}`,
    },
  };
}

export default async function PostDetailPage({ params }: PostPageProps) {
  const { slug } = await params;
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const res = await getPostAndTranslation(slug, locale);

  if (!res) {
    notFound();
  }

  if (res.shouldRedirect && res.redirectUrl) {
    redirect(res.redirectUrl);
  }

  const { resolvedData } = res;
  const prefix = locale === 'de' ? '' : `/${locale}`;

  const formattedDate = resolvedData.published_at
    ? new Date(resolvedData.published_at).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date(resolvedData.created_at).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const sanitizedContent = (resolvedData.content || '').replaceAll('https://puresim.com', `${BASE_URL}${prefix}/tariffs`);
  const parsedContentHtml = parseMarkdownToHtml(sanitizedContent);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Navigation Breadcrumb bar */}
      <div className="bg-slate-50 border-b border-slate-200 py-3.5">
        <div className="mx-auto max-w-3xl px-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href={prefix || '/'} className="hover:text-brand-700 transition-colors">
            {t('nav_home' as any) || 'Home'}
          </Link>
          <span>/</span>
          <Link href={`${prefix}/blog`} className="hover:text-brand-700 transition-colors">
            {t('nav_blog' as any) || 'Blog'}
          </Link>
          <span>/</span>
          <span className="text-slate-800 truncate max-w-[200px] sm:max-w-xs">{resolvedData.title}</span>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 pt-10">
        <div className="mb-4">
          <span className="inline-flex items-center rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-bold text-brand-700">
            {resolvedData.category === 'guide' ? t('blog_tab_guides' as any) || 'Ratgeber' : t('blog_tab_news' as any) || 'News'}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
          {resolvedData.title}
        </h1>

        <div className="flex items-center gap-4 text-xs font-medium text-slate-500 pb-8 border-b border-slate-100 mb-8">
          <span>{formattedDate}</span>
          <span>•</span>
          <span>PureSim Redaktion</span>
        </div>

        {resolvedData.featured_image && (
          <div className="mb-10 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <img
              src={resolvedData.featured_image}
              alt={resolvedData.title}
              className="w-full h-auto object-cover max-h-[420px]"
            />
          </div>
        )}

        <div
          className="prose prose-slate max-w-none text-slate-800 leading-relaxed space-y-4"
          dangerouslySetInnerHTML={{ __html: parsedContentHtml }}
        />

        {/* Back to Blog CTA & eSIM Search */}
        <div className="mt-14 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href={`${prefix}/blog`}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
          >
            ← {t('blog_tab_guides' as any) ? 'Alle Artikel' : 'All articles'}
          </Link>

          <Link
            href={`${prefix}/tariffs`}
            className="btn-primary !h-12 !px-6 text-sm"
          >
            {t('hero_cta_plans')} →
          </Link>
        </div>
      </article>
    </div>
  );
}
