import { createServiceClient } from '@/lib/supabase/server';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  nl: 'Dutch',
  pl: 'Polish',
  pt: 'Portuguese',
  tr: 'Turkish',
  sv: 'Swedish',
  da: 'Danish',
  fi: 'Finnish',
  cs: 'Czech',
  ro: 'Romanian',
  hu: 'Hungarian',
};

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\--+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

export async function translateArticle(postId: string, locale: string): Promise<any> {
  const db = createServiceClient();

  // 1. Fetch original post
  const { data: post, error: fetchErr } = await db
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (fetchErr || !post) {
    throw new Error(`Original post not found: ${fetchErr?.message || 'Unknown'}`);
  }

  // If the locale is German ('de'), we don't need to translate (default post is in German).
  if (locale === 'de') {
    return {
      post_id: post.id,
      locale: 'de',
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
    };
  }

  const targetLang = LANGUAGE_NAMES[locale];
  if (!targetLang) {
    throw new Error(`Unsupported target locale: ${locale}`);
  }

  // 2. Read translation model setting
  const { data: modelSetting } = await db
    .from('system_settings')
    .select('value')
    .eq('key', 'blog_translator_model')
    .maybeSingle();

  const translatorModel = modelSetting?.value || 'deepseek-v4-flash';
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not defined.');
  }

  console.log(`[Translation] Translating post "${post.title}" to ${targetLang} using ${translatorModel}...`);

  // 3. Request translation from DeepSeek
  const systemPrompt = `You are a professional translator and SEO expert. Translate the following blog post from German into ${targetLang}. 
Maintain the exact same Markdown formatting, headings (e.g. ##, ###), bold text (**text**), lists (- or *), inline code, and links. 
Ensure the translation sounds natural and professional in ${targetLang}.
For the URL slug: translate the German title into an SEO-friendly URL slug in ${targetLang} (lowercase, hyphen-separated, no special characters, convert characters like umlauts to equivalent letters).
Output your response as a valid JSON object ONLY. Do not include markdown codeblocks or any additional text. The JSON object must have the following structure:
{
  "title": "Translated Title",
  "slug": "translated-seo-slug",
  "excerpt": "Translated Excerpt",
  "content": "Translated markdown content..."
}`;

  const userPrompt = JSON.stringify({
    title: post.title,
    excerpt: post.excerpt || '',
    content: post.content,
  });

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: translatorModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more accurate translation
      response_format: { type: 'json_object' },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`DeepSeek API error (${response.status}): ${JSON.stringify(data)}`);
  }

  const resultText = data?.choices?.[0]?.message?.content;
  if (!resultText) {
    throw new Error('Empty response from DeepSeek API');
  }

  let clean = resultText.trim();
  if (clean.startsWith('```json')) {
    clean = clean.substring(7);
  } else if (clean.startsWith('```')) {
    clean = clean.substring(3);
  }
  if (clean.endsWith('```')) {
    clean = clean.substring(0, clean.length - 3);
  }
  clean = clean.trim();

  let translated;
  try {
    translated = JSON.parse(clean);
  } catch (err) {
    console.error('Failed to parse translation JSON. Raw text:', resultText);
    throw new Error('LLM did not return a valid translation JSON object.');
  }

  // Ensure slug is clean
  const finalSlug = slugify(translated.slug || translated.title);

  // 4. Save to database
  const { data: translationRecord, error: upsertErr } = await db
    .from('post_translations')
    .upsert({
      post_id: postId,
      locale,
      title: translated.title,
      slug: finalSlug,
      excerpt: translated.excerpt || null,
      content: translated.content,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'post_id,locale',
    })
    .select()
    .single();

  if (upsertErr) {
    throw new Error(`Failed to save translation: ${upsertErr.message}`);
  }

  return translationRecord;
}

export async function getOrCreateTranslation(postId: string, locale: string): Promise<any> {
  const db = createServiceClient();

  // Check if translation already exists
  const { data: translation } = await db
    .from('post_translations')
    .select('*')
    .eq('post_id', postId)
    .eq('locale', locale)
    .maybeSingle();

  if (translation) {
    return translation;
  }

  // Create new translation
  return await translateArticle(postId, locale);
}
