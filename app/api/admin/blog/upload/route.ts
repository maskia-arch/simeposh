import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export const runtime = 'nodejs';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm'];

export async function POST(request: Request) {
  // 1. Verify authorization secret (trusted M2M communication)
  const secret = process.env.SHOP_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[Upload] SHOP_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'SHOP_WEBHOOK_SECRET is not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    console.warn('[Upload] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.formData();
    const file = data.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 2. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      console.warn(`[Upload] Rejected unsupported MIME type: ${file.type}`);
      return NextResponse.json(
        { error: 'Unsupported file type. Only JPG, PNG, WEBP, GIF and MP4/WEBM videos are allowed.' },
        { status: 400 }
      );
    }

    // 3. Validate file extension (anti-exploit/path traversal prevention)
    const originalName = file.name || '';
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      console.warn(`[Upload] Rejected unsupported extension: ${ext} (original: ${originalName})`);
      return NextResponse.json({ error: 'Invalid file extension.' }, { status: 400 });
    }

    // 4. Generate unique filename (prevents collisions and filename exploits)
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const safeName = `${Date.now()}-${uniqueId}${ext}`;

    // 5. Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    // 6. Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, safeName);
    await fs.writeFile(filePath, buffer);

    console.log(`[Upload] File saved successfully: ${filePath} (${file.size} bytes)`);

    const publicUrl = `/uploads/${safeName}`;
    return NextResponse.json({ success: true, publicUrl });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Upload API Error]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
