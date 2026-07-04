/**
 * GET /auth/callback
 * Simple fallback redirect to login since code exchange is not used.
 */
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`);
}
