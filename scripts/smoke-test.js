#!/usr/bin/env node
/**
 * Post-deploy smoke test.
 *
 * Verifies the deployed app is actually serving - not suspended, not asleep,
 * and with the PWA assets reachable. Distinguishes a *suspended* service
 * (an account/quota state, fixable only in the Render dashboard) from a cold
 * start (normal on free tiers, just needs patience), because the two look
 * identical from a bare status code but need completely different responses.
 *
 * Usage:
 *   npm run smoke
 *   npm run smoke -- https://your-host.example.com
 */

const BASE = (process.argv[2] || process.env.SMOKE_URL || 'https://dexii.onrender.com').replace(/\/$/, '');
const TIMEOUT_MS = 60_000;

const get = async (path) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, { signal: controller.signal, redirect: 'follow' });
    const text = await res.text();
    return { ok: res.ok, status: res.status, headers: res.headers, text };
  } catch (err) {
    return { ok: false, status: 0, headers: new Headers(), text: '', error: err.message };
  } finally {
    clearTimeout(timer);
  }
};

const checks = [
  {
    name: 'Health endpoint',
    path: '/api/health',
    verify: (r) => {
      if (!r.ok) return `expected 200, got ${r.status}`;
      const body = JSON.parse(r.text);
      if (body.status !== 'ok') return `unexpected body: ${r.text.slice(0, 120)}`;
      return null;
    }
  },
  {
    name: 'App shell (index.html)',
    path: '/',
    verify: (r) => {
      if (!r.ok) return `expected 200, got ${r.status}`;
      if (!r.text.includes('<app-root')) return 'index.html did not contain <app-root>';
      return null;
    }
  },
  {
    name: 'PWA manifest',
    path: '/manifest.webmanifest',
    verify: (r) => {
      if (!r.ok) return `expected 200, got ${r.status}`;
      const manifest = JSON.parse(r.text);
      if (!manifest.icons?.length) return 'manifest has no icons';
      if (manifest.display !== 'standalone') return `display was "${manifest.display}"`;
      return null;
    }
  },
  {
    name: 'Service worker',
    path: '/ngsw-worker.js',
    verify: (r) => {
      if (!r.ok) return `expected 200, got ${r.status}`;
      // The SPA catch-all can shadow real files; make sure we got JS, not HTML.
      if (r.text.includes('<app-root')) return 'served index.html instead of the worker script';
      return null;
    }
  },
  {
    name: 'Service worker config excludes /api',
    path: '/ngsw.json',
    verify: (r) => {
      if (!r.ok) return `expected 200, got ${r.status}`;
      const config = JSON.parse(r.text);
      if (config.dataGroups?.length) {
        return 'dataGroups is non-empty - private API responses could be cached to disk';
      }
      const excludesApi = (config.navigationUrls || []).some(
        (rule) => rule.positive === false && rule.regex.includes('api')
      );
      if (!excludesApi) return '/api/** is not excluded from the service worker';
      return null;
    }
  },
  {
    name: 'Invite lookup rejects bogus tokens',
    path: '/api/friends/invite/definitely-not-a-real-token',
    verify: (r) => {
      // 404 is correct. 503 means the API is up but Mongo is not connected.
      if (r.status === 404) return null;
      if (r.status === 503) return 'API reachable but database is not connected';
      return `expected 404, got ${r.status}`;
    }
  }
];

const main = async () => {
  console.log(`Smoke testing ${BASE}\n`);

  const probe = await get('/api/health');
  if (probe.headers.get('x-render-routing') === 'suspend') {
    console.error('SUSPENDED - the service is suspended at Render\'s routing layer.');
    console.error('Requests never reach the app, so a green deploy does not help.');
    console.error('Fix: Render dashboard -> dexii -> Resume Service, or Manual Deploy.');
    process.exit(2);
  }

  let failures = 0;
  for (const check of checks) {
    const result = await get(check.path);
    let problem;
    try {
      problem = check.verify(result);
    } catch (err) {
      problem = `could not parse response: ${err.message}`;
    }

    if (problem) {
      failures += 1;
      console.error(`FAIL  ${check.name}\n      ${problem}`);
      if (result.error) console.error(`      (${result.error})`);
    } else {
      console.log(`ok    ${check.name}`);
    }
  }

  console.log();
  if (failures) {
    console.error(`${failures} of ${checks.length} checks failed.`);
    process.exit(1);
  }
  console.log(`All ${checks.length} checks passed.`);
};

main().catch((err) => {
  console.error('Smoke test crashed:', err.message);
  process.exit(1);
});
