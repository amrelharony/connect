export const config = { runtime: 'edge' };

const SB_URL = 'https://ninughddcomniliqimlu.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbnVnaGRkY29tbmlsaXFpbWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MjI5MzEsImV4cCI6MjA4NzM5ODkzMX0.50OkvD0C7AtQBhbUVd-RItVDpegUcDLyGT0kFIPhNyE';
const SITE  = 'https://amrelharony.com';

export default async function handler(req) {
  const url  = new URL(req.url);
  const slug = url.searchParams.get('post') || url.searchParams.get('blog');

  if (!slug || slug === 'feed') {
    return fetch(new URL('/_index.html', url.origin));
  }

  let article;
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/longform_articles?slug=eq.${encodeURIComponent(slug)}&select=title,excerpt,cover_image,created_at,updated_at,tags&published=eq.true&limit=1`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Accept: 'application/json' } }
    );
    const rows = await res.json();
    if (!rows || !rows.length) return fetch(new URL('/_index.html', url.origin));
    article = rows[0];
  } catch (_) {
    return fetch(new URL('/_index.html', url.origin));
  } 

  const htmlRes = await fetch(new URL('/_index.html', url.origin));
  let html = await htmlRes.text();

  const articleUrl = `${SITE}/?post=${encodeURIComponent(slug)}`;
  const title = esc(article.title);
  const desc  = esc(article.excerpt || article.title);
  const rawImage = article.cover_image || '';
  const hasCover = !!rawImage;
  const absImage = rawImage
    ? (rawImage.startsWith('http') ? rawImage : `${SITE}/${rawImage.replace(/^\//, '')}`)
    : '';
  const image = absImage
    ? `${SITE}/api/cover-proxy?url=${encodeURIComponent(absImage)}`
    : `${SITE}/Assets/profile.jpg`;

  html = html
    .replace(/<title>[^<]*<\/title>/, `<title>${title} \u2014 Amr Elharony</title>`)
    .replace(metaRe('property', 'og:type'),             `$1article"`)
    .replace(metaRe('property', 'og:title'),             `$1${title}"`)
    .replace(metaRe('property', 'og:description'),       `$1${desc}"`)
    .replace(metaRe('property', 'og:url'),               `$1${articleUrl}"`)
    .replace(metaRe('property', 'og:image'),             `$1${image}"`)
    .replace(metaRe('property', 'og:image:width'),       `$1${hasCover ? '1200' : '400'}"`)
    .replace(metaRe('property', 'og:image:height'),      `$1${hasCover ? '630' : '400'}"`)
    .replace(metaRe('property', 'og:image:alt'),         `$1${title}"`)
    .replace(metaRe('name',     'twitter:title'),        `$1${title}"`)
    .replace(metaRe('name',     'twitter:description'),  `$1${desc}"`)
    .replace(metaRe('name',     'twitter:image'),        `$1${image}"`)
    .replace(metaRe('name',     'twitter:image:alt'),    `$1${title}"`)
    .replace(metaRe('name',     'description'),          `$1${desc}"`)
    .replace(/(<link rel="canonical" href=")[^"]*"/,     `$1${articleUrl}"`);

  const ld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt || '',
    datePublished: article.created_at,
    dateModified: article.updated_at || article.created_at,
    author: { '@type': 'Person', name: 'Amr Elharony', url: SITE },
    publisher: { '@type': 'Person', name: 'Amr Elharony' },
    url: articleUrl,
    image: image,
    keywords: (article.tags || []).join(', ')
  });
  html = html.replace('</head>', `<script type="application/ld+json">${ld}</script>\n</head>`);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
    }
  });
}

function metaRe(attr, val) {
  const v = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(<meta\\s+(?:[^>]*?\\s)?${attr}="${v}"[\\s\\S]*?content=")[^"]*"`);
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
