export const config = { runtime: 'edge', maxDuration: 60 };

const SB_URL  = 'https://ninughddcomniliqimlu.supabase.co';
const SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbnVnaGRkY29tbmlsaXFpbWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MjI5MzEsImV4cCI6MjA4NzM5ODkzMX0.50OkvD0C7AtQBhbUVd-RItVDpegUcDLyGT0kFIPhNyE';
const SITE    = 'https://amrelharony.com';
const BATCH   = 90;

function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function getEnv(key) {
  return typeof process !== 'undefined' && process.env ? process.env[key] : '';
}

async function sbRpc(fn, params) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(params || {})
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RPC ${fn} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export default async function handler(req) {
  // Vercel cron triggers via GET with CRON_SECRET
  if (req.method === 'GET') {
    const cronSecret = getEnv('CRON_SECRET');
    if (cronSecret) {
      const auth = req.headers.get('authorization');
      if (auth !== `Bearer ${cronSecret}`) {
        return json({ error: 'Unauthorized' }, 401);
      }
    }
  }

  // Manual trigger via POST with admin secret
  if (req.method === 'POST') {
    const secret = getEnv('NEWSLETTER_ADMIN_SECRET');
    const auth = req.headers.get('x-admin-secret') || '';
    if (!secret || auth !== secret) {
      return json({ error: 'Unauthorized' }, 401);
    }
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const RESEND_KEY = getEnv('RESEND_API_KEY');
  if (!RESEND_KEY) {
    return json({ error: 'RESEND_API_KEY not configured' }, 500);
  }

  try {
    // 1. Check for pending batch from a previous run
    const pendingLogs = await sbRpc('get_last_bulletin', { p_status: 'pending' });
    let pendingBatch = Array.isArray(pendingLogs) && pendingLogs.length ? pendingLogs[0] : null;

    // 2. Determine cutoff date (last completed bulletin, or 14 days ago)
    let articlesSince;
    if (pendingBatch) {
      articlesSince = pendingBatch.articles_since;
    } else {
      const lastCompleted = await sbRpc('get_last_bulletin', { p_status: 'sent' });
      if (Array.isArray(lastCompleted) && lastCompleted.length) {
        articlesSince = lastCompleted[0].sent_at;
      } else {
        articlesSince = new Date(Date.now() - 14 * 86400000).toISOString();
      }
    }

    // 3. Fetch articles published since cutoff
    const articles = await sbRpc('get_bulletin_articles', { p_since: articlesSince });
    if (!Array.isArray(articles) || articles.length === 0) {
      return json({ ok: true, skipped: true, reason: 'No new articles since last bulletin' });
    }

    // 4. Fetch confirmed, non-unsubscribed subscribers
    const subscribers = await sbRpc('get_bulletin_subscribers');
    if (!Array.isArray(subscribers) || subscribers.length === 0) {
      return json({ ok: true, skipped: true, reason: 'No confirmed subscribers' });
    }

    // 5. Determine which batch to send
    let offset = 0;
    let logId = null;
    if (pendingBatch) {
      offset = pendingBatch.recipient_count - pendingBatch.batch_remaining;
      logId = pendingBatch.id;
    }

    const batch = subscribers.slice(offset, offset + BATCH);
    const remaining = subscribers.length - offset - batch.length;

    // 6. Send emails
    let sentCount = 0;
    for (const sub of batch) {
      const unsubUrl = `${SITE}/api/newsletter-unsubscribe?token=${encodeURIComponent(sub.unsubscribe_token)}`;
      const emailHtml = bulletinEmailHTML(articles, unsubUrl);

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Amr Elharony <noreply@updates.amrelharony.com>',
          to: [sub.email],
          subject: `${articles.length} New Article${articles.length !== 1 ? 's' : ''} — Biweekly Digest`,
          html: emailHtml
        })
      });

      if (emailRes.ok) sentCount++;
    }

    // 7. Log the bulletin
    if (!logId) {
      await sbRpc('create_bulletin_log', {
        p_article_count: articles.length,
        p_recipient_count: subscribers.length,
        p_batch_remaining: Math.max(0, remaining),
        p_articles_since: articlesSince,
        p_status: remaining > 0 ? 'pending' : 'sent'
      });
    } else {
      await sbRpc('update_bulletin_log', {
        p_id: logId,
        p_batch_remaining: Math.max(0, remaining),
        p_status: remaining > 0 ? 'pending' : 'sent'
      });
    }

    return json({
      ok: true,
      articles: articles.length,
      sent: sentCount,
      totalSubscribers: subscribers.length,
      remaining: Math.max(0, remaining)
    });
  } catch (e) {
    console.error('Bulletin error:', e);
    return json({ error: e.message }, 500);
  }
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

function bulletinEmailHTML(articles, unsubUrl) {
  const mono = "'JetBrains Mono',monospace";
  const sans = "'Inter',system-ui,-apple-system,sans-serif";

  const articleCards = articles.map(a => {
    const date = new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const tags = (a.tags || []).slice(0, 3).map(t =>
      `<span style="display:inline-block;padding:3px 10px;background:rgba(0,225,255,0.06);color:#00e1ff;border-radius:20px;font-size:10px;font-family:${mono};margin-right:6px;border:1px solid rgba(0,225,255,0.1)">${esc(t)}</span>`
    ).join('');
    const coverSrc = a.cover_image
      ? (a.cover_image.startsWith('http') ? a.cover_image : SITE + '/' + a.cover_image)
      : '';
    const coverBlock = coverSrc
      ? `<tr><td style="padding:0;line-height:0">
          <img src="${coverSrc}" alt="" width="558" style="width:100%;max-height:200px;object-fit:cover;display:block" />
          <div style="height:1px;background:linear-gradient(90deg,rgba(0,225,255,0.25),rgba(99,102,241,0.2),rgba(168,85,247,0.12))"></div>
        </td></tr>`
      : '';

    return `<tr><td style="padding:0 0 24px">
      <!-- Glass card: gradient border wrapper -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:16px;overflow:hidden;background:linear-gradient(135deg,rgba(0,225,255,0.18),rgba(99,102,241,0.12),rgba(168,85,247,0.06));box-shadow:0 8px 32px rgba(0,0,0,0.35)">
        <tr><td style="padding:1px">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0c1018;border-radius:15px;overflow:hidden">
            <!-- Inner glow highlight -->
            <tr><td style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent);font-size:1px;line-height:1px">&nbsp;</td></tr>
            ${coverBlock}
            <tr><td style="padding:24px 28px 24px">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
                <td style="font-size:11px;color:#64748b;font-family:${mono};letter-spacing:0.5px;padding-bottom:12px">
                  <span style="color:rgba(0,225,255,0.5)">&#9670;</span>&ensp;${date}
                </td>
              </tr></table>
              <h2 style="margin:0 0 10px;line-height:1.4">
                <a href="${SITE}/?post=${encodeURIComponent(a.slug)}" style="color:#f0f2f5;font-size:18px;font-weight:700;text-decoration:none;font-family:${sans}">${esc(a.title)}</a>
              </h2>
              ${a.excerpt ? `<p style="color:#8a95a8;font-size:13px;line-height:1.7;margin:0 0 16px;font-family:${sans}">${esc(a.excerpt.slice(0, 200))}${a.excerpt.length > 200 ? '&hellip;' : ''}</p>` : ''}
              ${tags ? `<div style="margin-bottom:18px">${tags}</div>` : ''}
              <table cellpadding="0" cellspacing="0" role="presentation"><tr>
                <td style="background:rgba(0,225,255,0.06);border-radius:6px;border:1px solid rgba(0,225,255,0.1)">
                  <a href="${SITE}/?post=${encodeURIComponent(a.slug)}" style="display:inline-block;padding:8px 18px;color:#00e1ff;font-size:11px;font-weight:700;text-decoration:none;font-family:${mono};letter-spacing:0.8px">READ&ensp;MORE&ensp;&#8594;</a>
                </td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>`;
  }).join('');

  const now = new Date();
  const twoWeeksAgo = new Date(now - 14 * 86400000);
  const fmtD = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dateRange = `${fmtD(twoWeeksAgo)} &mdash; ${fmtD(now)}, ${now.getFullYear()}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<!--[if !mso]><!--><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');</style><!--<![endif]-->
</head>
<body style="margin:0;padding:0;background:#06080f;font-family:${sans};-webkit-font-smoothing:antialiased">

<!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" style="background:#06080f"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0"><tr><td style="padding:48px 24px 40px"><![endif]-->
<!--[if !mso]><!-->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#06080f">
<tr><td style="background:radial-gradient(ellipse at 50% 0%,rgba(0,225,255,0.07) 0%,rgba(99,102,241,0.03) 35%,transparent 65%);padding:48px 16px 40px" align="center">
<!--<![endif]-->

<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%">

  <!-- ===== HEADER ===== -->
  <tr><td style="padding:0 0 44px;text-align:center">

    <!-- AE monogram -->
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 22px">
      <tr><td style="width:64px;height:64px;border-radius:50%;text-align:center;vertical-align:middle;background:linear-gradient(135deg,#00e1ff,#6366f1,#a855f7);box-shadow:0 6px 28px rgba(0,225,255,0.28),0 0 0 1px rgba(0,225,255,0.1)">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" style="width:64px;height:64px;v-text-anchor:middle" arcsize="50%" fillcolor="#00e1ff" stroke="f"><v:textbox inset="0,0,0,0"><center><![endif]-->
        <span style="font-family:${mono};font-size:20px;font-weight:700;color:#ffffff;letter-spacing:3px;line-height:64px">AE</span>
        <!--[if mso]></center></v:textbox></v:roundrect><![endif]-->
      </td></tr>
    </table>

    <p style="margin:0 0 6px;color:#64748b;font-size:11px;font-family:${mono};letter-spacing:2px;text-transform:uppercase">BIWEEKLY DIGEST</p>
    <h1 style="margin:0 0 8px;color:#f0f2f5;font-size:26px;font-weight:800;letter-spacing:-0.3px;font-family:${sans}">Your Latest Articles</h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:13px;font-family:${mono};letter-spacing:0.3px">${articles.length} article${articles.length !== 1 ? 's' : ''}&ensp;&middot;&ensp;${dateRange}</p>

    <!-- Gradient accent bar -->
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto"><tr>
      <td style="width:80px;height:3px;border-radius:3px;background:linear-gradient(90deg,#00e1ff,#6366f1,#a855f7)"></td>
    </tr></table>

  </td></tr>

  <!-- ===== ARTICLES ===== -->
  ${articleCards}

  <!-- ===== CTA ===== -->
  <tr><td style="text-align:center;padding:12px 0 44px">
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto"><tr>
      <td style="border-radius:10px;background:linear-gradient(135deg,#00e1ff,#6366f1);box-shadow:0 6px 24px rgba(0,225,255,0.3),0 0 0 1px rgba(0,225,255,0.15)">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" style="width:240px;height:48px;v-text-anchor:middle" arcsize="20%" fillcolor="#00e1ff" stroke="f"><center><![endif]-->
        <a href="${SITE}/?blog=feed" style="display:inline-block;padding:15px 40px;color:#06080f;font-weight:700;font-size:12px;text-decoration:none;letter-spacing:1.5px;text-transform:uppercase;font-family:${mono}">VIEW ALL ARTICLES</a>
        <!--[if mso]></center></v:roundrect><![endif]-->
      </td>
    </tr></table>
  </td></tr>

  <!-- ===== FOOTER ===== -->
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
      <td style="height:1px;background:linear-gradient(90deg,transparent 0%,rgba(0,225,255,0.12) 20%,rgba(99,102,241,0.12) 50%,rgba(168,85,247,0.08) 80%,transparent 100%)"></td>
    </tr></table>
  </td></tr>

  <tr><td style="text-align:center;padding:32px 0 0">
    <p style="color:#475569;font-size:11px;margin:0 0 14px;font-family:${sans};line-height:1.7">
      You're receiving this because you subscribed to updates from<br/>
      <a href="${SITE}" style="color:#64748b;text-decoration:none;font-weight:600">amrelharony.com</a>
    </p>
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto"><tr>
      <td style="padding:0 10px"><a href="${unsubUrl}" style="color:#475569;font-size:11px;text-decoration:underline;font-family:${sans}">Unsubscribe</a></td>
      <td style="color:#1e293b;font-size:9px">&bull;</td>
      <td style="padding:0 10px"><a href="${SITE}/?blog=feed" style="color:#475569;font-size:11px;text-decoration:none;font-family:${sans}">Read on site</a></td>
    </tr></table>
    <p style="color:#1e293b;font-size:10px;margin:24px 0 0;font-family:${mono};letter-spacing:1.5px">&copy; ${new Date().getFullYear()} AMR ELHARONY</p>
  </td></tr>

</table>

<!--[if !mso]><!--></td></tr></table><!--<![endif]-->
<!--[if mso]></td></tr></table></td></tr></table><![endif]-->

</body></html>`;
}
