// db-keepalive.js — Ping Supabase to prevent free-tier hibernation
// Run every 3 days via cron, GitHub Actions, or any scheduler
//
// Usage:
//   node db-keepalive.js
//
// Crontab (every 3 days at midnight):
//   0 0 */3 * * node /path/to/db-keepalive.js

const SB_URL = 'https://ninughddcomniliqimlu.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbnVnaGRkY29tbmlsaXFpbWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MjI5MzEsImV4cCI6MjA4NzM5ODkzMX0.50OkvD0C7AtQBhbUVd-RItVDpegUcDLyGT0kFIPhNyE';

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
