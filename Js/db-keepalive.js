// db-keepalive.js — Ping Supabase to prevent free-tier hibernation
// Run every 3 days via cron, GitHub Actions, or any scheduler
//
// Usage:
//   node db-keepalive.js
//
// Crontab (every 3 days at midnight):
//   0 0 */3 * * node /path/to/db-keepalive.js

const SB_URL = 'https://ninughddcomniliqimlu.supabase.co';
const SB_KEY = 'sb_publishable_YaSfemHxR3HcrzpFW0QvZA_qoOj5SG7';

async function ping() {
  const endpoint = `${SB_URL}/rest/v1/site_visits?select=id&limit=1`;
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Accept': 'application/json'
      }
    });
    const status = res.status;
    const now = new Date().toISOString();
    if (res.ok) {
      console.log(`[${now}] DB ping OK (${status})`);
    } else {
      const body = await res.text();
      console.error(`[${now}] DB ping FAILED (${status}): ${body}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] DB ping ERROR: ${err.message}`);
    process.exit(1);
  }
}

ping();
