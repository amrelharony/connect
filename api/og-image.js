export const config = { runtime: 'edge' };

const ALLOWED_HOST = 'ninughddcomniliqimlu.supabase.co';

export default async function handler(req) {
  const url = new URL(req.url);
  const imageUrl = url.searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  let parsed;
  try { parsed = new URL(imageUrl); } catch (_) {
    return new Response('Invalid url', { status: 400 });
  }

  if (parsed.hostname !== ALLOWED_HOST) {
    return new Response('Forbidden host', { status: 403 });
  }

  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return new Response('Image not found', { status: 404 });
    }

    const contentType = imgRes.headers.get('content-type') || 'image/png';
    const body = await imgRes.arrayBuffer();

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (_) {
    return new Response('Failed to fetch image', { status: 502 });
  }
}
