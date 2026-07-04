import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const secret = process.env.SHOP_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'SHOP_WEBHOOK_SECRET not configured' }, { status: 500 });
  }

  // Authorization check (M2M signature or token)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.formData();
    const file = data.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads directory on VPS
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileExt = file.name.split('.').pop();
    const originalName = file.name.replace(/\.[^/.]+$/, "");
    const slugify = (text: string) => text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');

    const fileName = `${Date.now()}_${slugify(originalName)}.${fileExt}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, buffer);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const publicUrl = `${appUrl}/uploads/${fileName}`;

    console.log(`[Upload] Saved local file: ${fileName} on VPS. Public URL: ${publicUrl}`);

    return NextResponse.json({ success: true, publicUrl });
  } catch (err: any) {
    console.error('[Upload API] Local upload error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
