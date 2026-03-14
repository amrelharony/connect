export const config = { runtime: 'edge' };

const SB_URL  = 'https://ninughddcomniliqimlu.supabase.co';
const SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbnVnaGRkY29tbmlsaXFpbWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MjI5MzEsImV4cCI6MjA4NzM5ODkzMX0.50OkvD0C7AtQBhbUVd-RItVDpegUcDLyGT0kFIPhNyE';
const SITE    = 'https://amrelharony.com';

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

function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

async function sbRpc(fn, params) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return res;
}

export default async function handler(req) {
  const url = new URL(req.url);

  // GET: user clicked confirmation link from email
  if (req.method === 'GET') {
    const token = url.searchParams.get('token');
    if (!token) {
      return html('Invalid Link', '<div class="icon">⚠️</div><div class="title">Invalid Link</div><div class="sub">This confirmation link is missing or malformed.</div><a class="btn" href="' + SITE + '">Go to Site</a>');
    }

    const res = await sbRpc('confirm_newsletter', { p_token: token });
    if (!res.ok) {
      return html('Error', '<div class="icon">⚠️</div><div class="title">Something went wrong</div><div class="sub">Please try again later.</div><a class="btn" href="' + SITE + '">Go to Site</a>');
    }

    return html('Subscription Confirmed', `<div class="icon">✅</div><div class="title">You're In!</div>
<div class="sub">Your subscription is confirmed. You'll receive a biweekly digest of new articles from Amr Elharony.</div>
<a class="btn" href="${SITE}/?blog=feed">Read Articles</a>`);
  }

  // POST: frontend calls this after subscribe to trigger confirmation email
  if (req.method === 'POST') {
    try {
      const { email, token } = await req.json();
      if (!email || !token) {
        return new Response(JSON.stringify({ error: 'Missing email or token' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const RESEND_KEY = typeof process !== 'undefined' && process.env ? process.env.RESEND_API_KEY : '';
      if (!RESEND_KEY) {
        return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }

      const confirmUrl = `${SITE}/api/newsletter-confirm?token=${encodeURIComponent(token)}`;

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Amr Elharony <noreply@amrelharony.com>',
          to: [email],
          subject: 'Confirm your subscription — Amr Elharony',
          html: confirmationEmailHTML(confirmUrl)
        })
      });

      if (!emailRes.ok) {
        const err = await emailRes.text();
        console.error('Resend error:', err);
        // #region agent log
        return new Response(JSON.stringify({ error: 'Failed to send email', resendStatus: emailRes.status, resendError: err }), { status: 502, headers: { 'Content-Type': 'application/json' } });
        // #endregion
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}

function confirmationEmailHTML(confirmUrl) {
  const mono = "'JetBrains Mono',monospace";
  const sans = "'Inter',system-ui,-apple-system,sans-serif";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<!--[if !mso]><!--><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');</style><!--<![endif]-->
</head>
<body style="margin:0;padding:0;background:#06080f;font-family:${sans};-webkit-font-smoothing:antialiased">

<!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" style="background:#06080f"><tr><td align="center"><table width="520" cellpadding="0" cellspacing="0"><tr><td style="padding:60px 24px 48px"><![endif]-->
<!--[if !mso]><!-->
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#06080f">
<tr><td style="background:radial-gradient(ellipse at 50% 0%,rgba(0,225,255,0.07) 0%,rgba(99,102,241,0.03) 35%,transparent 65%);padding:60px 16px 48px" align="center">
<!--<![endif]-->

<table width="520" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;width:100%">

  <!-- Glass card: gradient border wrapper -->
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:20px;overflow:hidden;background:linear-gradient(135deg,rgba(0,225,255,0.2),rgba(99,102,241,0.15),rgba(168,85,247,0.08));box-shadow:0 8px 40px rgba(0,0,0,0.4)">
      <tr><td style="padding:1px">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0c1018;border-radius:19px;overflow:hidden">
          <!-- Inner glow highlight -->
          <tr><td style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent);font-size:1px;line-height:1px">&nbsp;</td></tr>
          <tr><td style="padding:52px 44px;text-align:center">

            <!-- AE monogram -->
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 26px">
              <tr><td style="width:60px;height:60px;border-radius:50%;text-align:center;vertical-align:middle;background:linear-gradient(135deg,#00e1ff,#6366f1,#a855f7);box-shadow:0 6px 28px rgba(0,225,255,0.28),0 0 0 1px rgba(0,225,255,0.1)">
                <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" style="width:60px;height:60px;v-text-anchor:middle" arcsize="50%" fillcolor="#00e1ff" stroke="f"><v:textbox inset="0,0,0,0"><center><![endif]-->
                <span style="font-family:${mono};font-size:18px;font-weight:700;color:#ffffff;letter-spacing:3px;line-height:60px">AE</span>
                <!--[if mso]></center></v:textbox></v:roundrect><![endif]-->
              </td></tr>
            </table>

            <h1 style="color:#f0f2f5;font-size:24px;font-weight:800;margin:0 0 8px;letter-spacing:-0.3px;font-family:${sans}">Confirm Your Subscription</h1>

            <!-- Gradient accent bar -->
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 28px"><tr>
              <td style="width:60px;height:3px;border-radius:3px;background:linear-gradient(90deg,#00e1ff,#6366f1,#a855f7)"></td>
            </tr></table>

            <p style="color:#8a95a8;font-size:14px;line-height:1.75;margin:0 0 36px;font-family:${sans}">
              You requested to join <strong style="color:#cbd5e1;font-weight:600">Amr Elharony's</strong> biweekly digest. Click below to confirm and start receiving curated article summaries.
            </p>

            <!-- Gradient CTA button -->
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 32px"><tr>
              <td style="border-radius:10px;background:linear-gradient(135deg,#00e1ff,#6366f1);box-shadow:0 6px 24px rgba(0,225,255,0.3),0 0 0 1px rgba(0,225,255,0.15)">
                <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" style="width:260px;height:48px;v-text-anchor:middle" arcsize="20%" fillcolor="#00e1ff" stroke="f"><center><![endif]-->
                <a href="${confirmUrl}" style="display:inline-block;padding:15px 44px;color:#06080f;font-weight:700;font-size:12px;text-decoration:none;letter-spacing:1.5px;text-transform:uppercase;font-family:${mono}">CONFIRM SUBSCRIPTION</a>
                <!--[if mso]></center></v:roundrect><![endif]-->
              </td>
            </tr></table>

            <!-- Subtle divider -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px"><tr>
              <td style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)"></td>
            </tr></table>

            <p style="color:#475569;font-size:11px;margin:0;font-family:${sans};line-height:1.6">If you didn't request this, you can safely ignore this email.</p>

          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:32px 0 0;text-align:center">
    <p style="color:#334155;font-size:11px;margin:0 0 8px;font-family:${sans}">
      <a href="https://amrelharony.com" style="color:#475569;text-decoration:none;font-weight:600">amrelharony.com</a>
    </p>
    <p style="color:#1e293b;font-size:10px;margin:0;font-family:${mono};letter-spacing:1.5px">&copy; ${new Date().getFullYear()} AMR ELHARONY</p>
  </td></tr>

</table>

<!--[if !mso]><!--></td></tr></table><!--<![endif]-->
<!--[if mso]></td></tr></table></td></tr></table><![endif]-->

</body></html>`;
}
