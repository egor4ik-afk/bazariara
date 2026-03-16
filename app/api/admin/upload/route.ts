import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { isAuthenticated, unauthorizedResponse } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const filename = req.nextUrl.searchParams.get('filename') || 'upload.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  // Сохраняем как webp если это изображение
  const blobName = `admin/${Date.now()}_${filename.replace(/\.[^.]+$/, '.webp')}`;

  const body = await req.arrayBuffer();

  const blob = await put(blobName, body, {
    access: 'public',
    contentType: 'image/webp',
  });

  return NextResponse.json({ url: blob.url });
}

export async function DELETE(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  try {
    await del(url);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}