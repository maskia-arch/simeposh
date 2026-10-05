import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { query } from '@/lib/db';
import { getServerT, getServerLocale } from '@/lib/i18n/server';
import { getOrCreateTranslation } from '@/lib/blog/translation';
import { buildAlternates, BASE_URL } from '@/lib/seo';

interface PostResolution {
  post: any;
  deSlug: string;
  enSlug: string;
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

async function getPostAndTranslation(slug: string, locale: string): Promise<PostResolution | null> {
  // 1. Try to find the post where slug matches the main posts table
  let isGermanSlug = true;
  let postRes = await query('SELECT * FROM posts WHERE slug = $1 AND is_published = true AND status = $2', [slug, 'approved']);
  let post = postRes.rows[0];

  // 2. If not found, try to find it by slug in post_translations
  if (!post) {
    let transRes = await query('SELECT post_id, slug, locale FROM post_translations WHERE slug = $1', [slug]);
    let trans = transRes.rows[0];
    if (trans) {
      let mainRes = await query('SELECT * FROM posts WHERE id = $1 AND is_published = true AND status = $2', [trans.post_id, 'approved']);
      post = mainRes.rows[0];
      isGermanSlug = false;
    }
  }

  if (!post) return null;

  const deSlug = post.slug;
  const transEnRes = await query('SELECT * FROM post_translations WHERE post_id = $1 AND locale = $2', [post.id, 'en']);
  let enTranslation = transEnRes.rows[0];

  if (!enTranslation && locale === 'en') {
    try {
      enTranslation = await getOrCreateTranslation(post.id, 'en');
    } catch (err) {
      console.error(`[Translation Fallback] Failed to translate post ${post.id} to en:`, err);
    }
  }

  const enSlug = enTranslation?.slug || (!isGermanSlug ? slug : post.slug);

  // Check whether request needs canonical language URL redirect
  let shouldRedirect = false;
  let redirectUrl: string | undefined;

  if (locale === 'de') {
    // English slug accessed under German URL (/blog/...)
    if (!isGermanSlug || (slug === enSlug && enSlug !== deSlug)) {
      shouldRedirect = true;
      redirectUrl = `/en/blog/${enSlug}`;
    }
  } else if (locale === 'en') {
    // German slug accessed under English URL (/en/blog/...)
    if (isGermanSlug && enSlug !== deSlug) {
      shouldRedirect = true;
      redirectUrl = `/en/blog/${enSlug}`;
    }
  }

  const isDe = locale === 'de';
  const resolvedData = {
    title: isDe ? post.title : (enTranslation?.title || post.title),
    slug: isDe ? post.slug : (enTranslation?.slug || post.slug),
    excerpt: isDe ? post.excerpt : (enTranslation?.excerpt || post.excerpt),
    content: isDe ? post.content : (enTranslation?.content || post.content),
    category: post.category,
    featured_image: post.featured_image,
    published_at: post.published_at,
    created_at: post.created_at,
  };

  return {
    post,
    deSlug,
    enSlug,
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
  
  // If the content is already HTML, return it directly
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

  // Bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic (*text*)
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Inline Code (`code`)
  html = html.replace(/`(.*?)`/g, '<code class="bg-slate-100 rounded px-1.5 py-0.5 text-sm font-mono text-indigo-600">$1</code>');

  // Links ([text](url))
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

  const { deSlug, enSlug, resolvedData } = res;
  const isDe = locale === 'de';

  return {
    title: resolvedData.title,
    description: resolvedData.excerpt || (isDe ? 'Lies den vollständigen Artikel in unserem Blog.' : 'Read the full article on our blog.'),
    alternates: buildAlternates(isDe ? 'de' : 'en', {
      dePath: `blog/${deSlug}`,
      enPath: `blog/${enSlug}`,
    }),
    openGraph: {
      title: resolvedData.title,
      description: resolvedData.excerpt,
      locale: isDe ? 'de_DE' : 'en_US',
      url: isDe ? `${BASE_URL}/blog/${deSlug}` : `${BASE_URL}/en/blog/${enSlug}`,
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
  const prefix = locale === 'en' ? '/en' : '';

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
          <Link href={prefix || '/'} className="hover:text-brand-700 transition-colors">Home</Link>
          <span>/</span>
          <Link href={`${prefix}/blog`} className="hover:text-brand-700 transition-colors">Blog</Link>
          <span>/</span>
          <span className="text-slate-800 truncate">{resolvedData.title}</span>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 mt-10">
        {/* Article Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white ${
            resolvedData.category === 'guide' ? 'bg-brand-600' : 'bg-teal-600'
          }`}>
            {resolvedData.category === 'guide' 
              ? (t('blog_category_guide' as any) || 'eSIM Grundlagen') 
              : (t('blog_category_news' as any) || 'News')}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {t('blog_published_at' as any) || 'Veröffentlicht am'} {formattedDate}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight mb-6">
          {resolvedData.title}
        </h1>

        {/* Excerpt */}
        {resolvedData.excerpt && (
          <p className="text-lg text-slate-500 border-l-4 border-slate-250 pl-4 py-1 italic mb-10 leading-relaxed">
            {resolvedData.excerpt}
          </p>
        )}

        {/* Featured Cover Image */}
        {resolvedData.featured_image ? (
          <div className="w-full rounded-2xl overflow-hidden shadow-md border border-slate-200/50 mb-12 aspect-[16/9] relative">
            <img 
              src={resolvedData.featured_image} 
              alt={resolvedData.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={`w-full rounded-2xl aspect-[16/9] shadow-md mb-12 relative flex items-center justify-center text-white bg-gradient-to-br ${
            resolvedData.category === 'guide' 
              ? 'from-brand-600 via-brand-700 to-indigo-850' 
              : 'from-indigo-500 to-brand-500'
          }`}>
            <span className="text-7xl">{resolvedData.category === 'guide' ? '📖' : '📡'}</span>
          </div>
        )}

        {/* Article content parsed from Markdown */}
        <div 
          className="prose prose-slate max-w-none mb-16 text-slate-800"
          dangerouslySetInnerHTML={{ __html: parsedContentHtml }}
        />

        {/* Conversion CTA Block */}
        <div className="rounded-3xl bg-gradient-to-br from-brand-900 to-indigo-950 text-white p-8 md:p-10 shadow-xl relative overflow-hidden mb-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent)] pointer-events-none" />
          <div className="relative z-10 md:flex items-center justify-between gap-6">
            <div className="max-w-md">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-200">
                {t('blog_cta_tagline' as any)}
              </span>
              <h3 className="text-xl md:text-2xl font-bold mt-2">
                {t('blog_cta_title' as any)}
              </h3>
              <p className="mt-2 text-brand-100 text-sm leading-relaxed">
                {t('blog_cta_desc' as any)}
              </p>
            </div>
            <div className="mt-6 md:mt-0 shrink-0">
              <Link
                href={`${prefix}/tariffs`}
                className="inline-block rounded-xl bg-white px-6 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50 transition-colors shadow-lg"
              >
                {t('footer_browse')}
              </Link>
            </div>
          </div>
        </div>

        {/* Back navigation */}
        <div className="border-t border-slate-100 pt-8">
          <Link
            href={`${prefix}/blog`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-850 group transition-colors"
          >
            <span className="transform group-hover:-translate-x-1 transition-transform">
              {t('blog_back' as any) || '← Zurück zum Blog'}
            </span>
          </Link>
        </div>
      </article>
    </div>
  );
}
