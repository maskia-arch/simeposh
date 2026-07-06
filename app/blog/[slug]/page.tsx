import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerT, getServerLocale } from '@/lib/i18n/server';
import { getOrCreateTranslation } from '@/lib/blog/translation';

async function getPostAndTranslation(slug: string, locale: string) {
  const supabase = await createClient();
  
  // 1. Try to find the post where slug matches the main posts table
  let { data: post } = (await supabase
    .from('posts')
    .select('*, post_translations(*)')
    .eq('slug', slug)
    .eq('is_published', true)
    .eq('status', 'approved')
    .maybeSingle()) as any;

  // 2. If not found, try to find it by slug in post_translations
  if (!post) {
    const { data: trans } = (await supabase
      .from('post_translations')
      .select('post_id')
      .eq('slug', slug)
      .maybeSingle()) as any;

    if (trans) {
      const { data: mainPost } = (await supabase
        .from('posts')
        .select('*, post_translations(*)')
        .eq('id', trans.post_id)
        .eq('is_published', true)
        .eq('status', 'approved')
        .maybeSingle()) as any;
      post = mainPost;
    }
  }

  if (!post) return null;

  // 3. Resolve translation
  if (locale === 'de') {
    return {
      ...post,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
    };
  }

  // Find translation in existing translations list
  let translation = post.post_translations?.find((t: any) => t.locale === locale);

  // If translation is missing (auto-translate fallback!), we create it on the fly!
  if (!translation) {
    try {
      translation = await getOrCreateTranslation(post.id, locale);
    } catch (err) {
      console.error(`[Translation Fallback] Failed to translate post ${post.id} to ${locale}:`, err);
    }
  }

  return {
    ...post,
    title: translation?.title || post.title,
    slug: translation?.slug || post.slug,
    excerpt: translation?.excerpt || post.excerpt,
    content: translation?.content || post.content,
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
  const post = await getPostAndTranslation(slug, locale);

  if (!post) {
    return { title: 'Artikel nicht gefunden' };
  }

  return {
    title: post.title,
    description: post.excerpt || 'Lies den vollständigen Artikel in unserem Blog.',
  };
}

export default async function PostDetailPage({ params }: PostPageProps) {
  const { slug } = await params;
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const post = await getPostAndTranslation(slug, locale);

  if (!post) {
    notFound();
  }

  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date(post.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const parsedContentHtml = parseMarkdownToHtml(post.content);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Navigation Breadcrumb bar */}
      <div className="bg-slate-50 border-b border-slate-200 py-3.5">
        <div className="mx-auto max-w-3xl px-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/" className="hover:text-brand-700 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-brand-700 transition-colors">Blog</Link>
          <span>/</span>
          <span className="text-slate-800 truncate">{post.title}</span>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 mt-10">
        {/* Article Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white ${
            post.category === 'guide' ? 'bg-brand-600' : 'bg-teal-600'
          }`}>
            {post.category === 'guide' 
              ? (t('blog_category_guide' as any) || 'eSIM Grundlagen') 
              : (t('blog_category_news' as any) || 'News')}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {t('blog_published_at' as any) || 'Veröffentlicht am'} {formattedDate}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight mb-6">
          {post.title}
        </h1>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-lg text-slate-500 border-l-4 border-slate-250 pl-4 py-1 italic mb-10 leading-relaxed">
            {post.excerpt}
          </p>
        )}

        {/* Featured Cover Image */}
        {post.featured_image ? (
          <div className="w-full rounded-2xl overflow-hidden shadow-md border border-slate-200/50 mb-12 aspect-[16/9] relative">
            <img 
              src={post.featured_image} 
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={`w-full rounded-2xl aspect-[16/9] shadow-md mb-12 relative flex items-center justify-center text-white bg-gradient-to-br ${
            post.category === 'guide' 
              ? 'from-brand-600 via-brand-700 to-indigo-850' 
              : 'from-indigo-500 to-brand-500'
          }`}>
            <span className="text-7xl">{post.category === 'guide' ? '📖' : '📡'}</span>
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
                href="/tariffs"
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
            href="/blog"
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
