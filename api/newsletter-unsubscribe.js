export const config = { runtime: 'edge' };

const SB_URL = 'https://ninughddcomniliqimlu.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbnVnaGRkY29tbmlsaXFpbWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MjI5MzEsImV4cCI6MjA4NzM5ODkzMX0.50OkvD0C7AtQBhbUVd-RItVDpegUcDLyGT0kFIPhNyE';
const SITE   = 'https://amrelharony.com';

function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function html(title, body) {
  return new Response(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — Amr Elharony</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',system-ui,sans-serif;background:#0a0e17;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
.card{max-width:440px;text-align:center;padding:48px 32px;border:1px solid rgba(255,255,255,.08);border-radius:16px;background:rgba(255,255,255,.03);backdrop-filter:blur(12px)}
.icon{font-size:48px;margin-bottom:16px}.title{font-size:22px;font-weight:700;margin-bottom:8px}.sub{font-size:14px;color:#94a3b8;line-height:1.6;margin-bottom:24px}
a.btn{display:inline-block;padding:12px 28px;background:#00e1ff;color:#0a0e17;font-weight:700;font-size:13px;text-decoration:none;border-radius:8px;letter-spacing:.5px;text-transform:uppercase}
a.btn:hover{opacity:.9}</style></head><body><div class="card">${body}</div></body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return html('Invalid Link', '<div class="icon">⚠️</div><div class="title">Invalid Link</div><div class="sub">This unsubscribe link is missing or malformed.</div><a class="btn" href="' + SITE + '">Go to Site</a>');
  }

  try {
    const res = await fetch(`${SB_URL}/rest/v1/rpc/unsubscribe_newsletter`, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: token })
    });

    if (!res.ok) {
      return html('Error', '<div class="icon">⚠️</div><div class="title">Something went wrong</div><div class="sub">Please try again later.</div><a class="btn" href="' + SITE + '">Go to Site</a>');
    }

    return html('Unsubscribed', `<div class="icon">👋</div><div class="title">You've Been Unsubscribed</div>
<div class="sub">Sorry to see you go. You will no longer receive the biweekly newsletter from Amr Elharony.</div>
<a class="btn" href="${SITE}/?blog=feed">Visit Blog</a>`);
  } catch (e) {
    return html('Error', '<div class="icon">⚠️</div><div class="title">Something went wrong</div><div class="sub">Please try again later.</div><a class="btn" href="' + SITE + '">Go to Site</a>');
  }
}
