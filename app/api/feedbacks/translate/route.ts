import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const comment = body?.comment?.trim();
    const locale = body?.locale?.trim() || 'de';

    if (!comment) {
      return NextResponse.json({ error: 'Kommentar fehlt.' }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('[Translation API] DEEPSEEK_API_KEY is not defined.');
      return NextResponse.json({ error: 'Übersetzungs-API ist nicht konfiguriert.' }, { status: 500 });
    }

    const targetLang = LANGUAGE_NAMES[locale] || 'German';

    const systemPrompt = `You are a professional translator. Translate the following user feedback comment into ${targetLang}. 
Ensure the translation sounds natural and captures the exact meaning/feeling.
Output the translation ONLY. Do not write any markdown formatting, codeblocks (like \`\`\`), or additional text. Just output the translation.`;

    const userPrompt = comment;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`DeepSeek API error (${response.status}): ${JSON.stringify(data)}`);
    }

    let translation = data?.choices?.[0]?.message?.content?.trim() || '';

    // Clean any accidental markdown code blocks
    if (translation.startsWith('```')) {
      const lines = translation.split('\n');
      if (lines[0].startsWith('```')) {
        lines.shift();
      }
      if (lines[lines.length - 1] === '```') {
        lines.pop();
      }
      translation = lines.join('\n').trim();
    }

    return NextResponse.json({
      success: true,
      translation,
    });
  } catch (err: any) {
    console.error('[POST /api/feedbacks/translate] Error:', err.message);
    return NextResponse.json({ error: 'Übersetzung fehlgeschlagen.' }, { status: 500 });
  }
}
