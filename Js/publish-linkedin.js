// publish-linkedin.js — Publish scheduled Supabase posts to LinkedIn
// Runs via GitHub Actions cron every minute
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_KEY,
//   LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN
//   LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REFRESH_TOKEN (for auto-refresh)

const SITE = 'https://amrelharony.com';

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const LI_TOKEN_VAR = { value: process.env.LINKEDIN_ACCESS_TOKEN };
const LI_PERSON = process.env.LINKEDIN_PERSON_URN;

if (!SB_URL || !SB_KEY || !LI_TOKEN_VAR.value || !LI_PERSON) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const sbHeaders = {
  'apikey': SB_KEY,
  'Authorization': `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Prefer': 'return=minimal'
};

async function sbQuery(table, filter) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, { headers: sbHeaders });
  if (!res.ok) throw new Error(`Supabase GET ${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sbUpdate(table, id, data) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${table}/${id}: ${res.status} ${await res.text()}`);
}

async function refreshTokenIfNeeded() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const refreshToken = process.env.LINKEDIN_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return;

  const testRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${LI_TOKEN_VAR.value}` }
  });

  if (testRes.status === 401) {
    console.log('Access token expired, refreshing...');
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    });
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      throw new Error(`LinkedIn token refresh failed: ${tokenRes.status} ${body}`);
    }
    const tokenData = await tokenRes.json();
    LI_TOKEN_VAR.value = tokenData.access_token;
    console.log('Token refreshed successfully. Update LINKEDIN_ACCESS_TOKEN secret with the new token.');
    console.log(`::warning::LinkedIn access token was refreshed. Update the LINKEDIN_ACCESS_TOKEN repository secret. New token starts with: ${LI_TOKEN_VAR.value.substring(0, 12)}...`);
  }
}

async function postToLinkedIn(text, articleUrl) {
  const body = {
    author: LI_PERSON,
    lifecycleState: 'PUBLISHED',
    visibility: 'PUBLIC',
    commentary: text,
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: []
    }
  };

  if (articleUrl) {
    body.content = {
      article: {
        source: articleUrl,
        title: text.split('\n')[0] || 'New Article'
      }
    };
  }

  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LI_TOKEN_VAR.value}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202601'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`LinkedIn POST failed: ${res.status} ${errBody}`);
  }

  const postId = res.headers.get('x-restli-id') || res.headers.get('x-linkedin-id') || '';
  console.log(`  LinkedIn post created: ${postId}`);
  return postId;
}

async function publishThoughts() {
  const now = new Date().toISOString();
  const rows = await sbQuery('microblog',
    `select=id,content,image_url,published&linkedin_posted=eq.false&or=(and(published.eq.true,scheduled_at.is.null),and(scheduled_at.not.is.null,scheduled_at.lte.${now}))`
  );

  console.log(`Found ${rows.length} thought(s) due for LinkedIn`);

  for (const row of rows) {
    try {
      console.log(`Publishing thought ${row.id}...`);
      await postToLinkedIn(row.content);
      await sbUpdate('microblog', row.id, { linkedin_posted: true, published: true });
      console.log(`  Done: ${row.id}`);
    } catch (err) {
      console.error(`  Failed thought ${row.id}: ${err.message}`);
    }
  }
}

async function publishArticles() {
  const now = new Date().toISOString();
  const rows = await sbQuery('longform_articles',
    `select=id,title,slug,excerpt,content,published&linkedin_posted=eq.false&or=(published.eq.true,and(scheduled_at.not.is.null,scheduled_at.lte.${now}))`
  );

  console.log(`Found ${rows.length} article(s) due for LinkedIn`);

  for (const row of rows) {
    try {
      console.log(`Publishing article "${row.title}" (${row.id})...`);
      const url = `${SITE}/?blog=${encodeURIComponent(row.slug)}`;
      const text = `${row.title}\n\n${row.excerpt || ''}\n\nRead more: ${url}`.trim();
      await postToLinkedIn(text, url);
      await sbUpdate('longform_articles', row.id, { linkedin_posted: true, published: true });
      console.log(`  Done: ${row.id}`);
    } catch (err) {
      console.error(`  Failed article ${row.id}: ${err.message}`);
    }
  }
}

async function main() {
  const ts = new Date().toISOString();
  console.log(`[${ts}] LinkedIn publish run starting...`);

  await refreshTokenIfNeeded();
  await publishThoughts();
  await publishArticles();

  console.log(`[${new Date().toISOString()}] Done.`);
}

main().catch(err => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
