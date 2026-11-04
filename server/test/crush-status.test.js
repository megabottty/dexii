const { test, afterEach } = require('node:test');
const assert = require('node:assert');
const { fakeReq, fakeRes } = require('./helpers');
const CrushProfile = require('../src/models/CrushProfile');
const crushController = require('../src/controllers/crushController');
const { normalizeStatus } = require('../src/utils/crushStatus');

const originalSave = CrushProfile.prototype.save;
afterEach(() => { CrushProfile.prototype.save = originalSave; });

test('normalizeStatus maps retired statuses and keeps current ones (DEX-50)', () => {
  assert.strictEqual(normalizeStatus('Plotting'), 'Crush');
  assert.strictEqual(normalizeStatus('Crushing'), 'Crush');
  assert.strictEqual(normalizeStatus('Heartbroken'), 'Broken Up');
  assert.strictEqual(normalizeStatus('Friend'), 'Friends');
  assert.strictEqual(normalizeStatus('Dating'), 'Dating');
});

test('creating a crush saves with the status translated, not a server error', async () => {
  let saved = null;
  CrushProfile.prototype.save = async function () { saved = this; return this; };
  const res = fakeRes();
  await crushController.createCrush(fakeReq({ body: { nickname: 'Test', status: 'Plotting' } }), res);
  assert.ok(saved, `save was never reached (responded ${res.statusCode}: ${JSON.stringify(res.body)})`);
  assert.strictEqual(saved.status, 'Crush');
  assert.strictEqual(res.statusCode, 201);
});
