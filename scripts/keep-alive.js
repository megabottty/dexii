/**
 * Keep-Alive Pinger Script for Dexii Render Deployment
 *
 * Usage:
 *   node scripts/keep-alive.js
 *   RENDER_URL=https://your-app.onrender.com node scripts/keep-alive.js
 */

const targetUrl = (process.env.RENDER_URL || process.env.APP_URL || 'https://dexii.onrender.com').replace(/\/+$/, '');
const endpoint = `${targetUrl}/api/status`;
const INTERVAL_MS = parseInt(process.env.PING_INTERVAL_MS || String(14 * 60 * 1000), 10); // 14 mins

console.log(`[Keep-Alive] Initializing pinger for ${endpoint}`);
console.log(`[Keep-Alive] Ping interval: ${INTERVAL_MS / 1000 / 60} minutes`);

async function ping() {
  const timestamp = new Date().toISOString();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Dexii-KeepAlive/1.0' }
    });
    clearTimeout(timeout);

    const body = await response.text();
    console.log(`[${timestamp}] Ping: ${response.status} ${response.statusText}`);
    try {
      const json = JSON.parse(body);
      console.log(`[${timestamp}] DB status: ${json.database || 'unknown'}`);
    } catch {
      // Non-JSON response
    }
  } catch (err) {
    console.error(`[${timestamp}] Ping error: ${err.message}`);
  }
}

// Initial ping
ping();

// Periodic ping
setInterval(ping, INTERVAL_MS);
