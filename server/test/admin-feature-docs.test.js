const { test } = require('node:test');
const assert = require('node:assert');
const { fakeReq, fakeRes } = require('./helpers');
const { getFeatureDocs } = require('../src/controllers/adminController');

// "How our features work" lives in server/docs and is only served on the super-admin
// routes, so it never ships in the public app bundle.
test('serves the feature docs as markdown', async () => {
  const res = fakeRes();
  await getFeatureDocs(fakeReq({ userId: 'admin' }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.body.markdown, /^# Dexii: How Our Features Work/);
  assert.match(res.body.markdown, /node scripts\/theme-interest\.js/);
});

test('is mounted behind the super-admin check', () => {
  const router = require('../src/routes/admin');
  const paths = router.stack.filter((l) => l.route).map((l) => l.route.path);
  assert.ok(paths.includes('/docs/features'));
  const guards = router.stack.filter((l) => !l.route).map((l) => l.handle.name || l.name);
  assert.ok(router.stack.findIndex((l) => !l.route) < router.stack.findIndex((l) => l.route?.path === '/docs/features'));
  assert.ok(guards.length >= 2, 'auth and requireSuperAdmin run first');
});
