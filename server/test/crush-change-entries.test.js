const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { fakeReq, fakeRes, pretendConnected } = require('./helpers');
const CrushProfile = require('../src/models/CrushProfile');
const Entry = require('../src/models/Entry');
const { updateCrush } = require('../src/controllers/crushController');
const { changeEntriesFor } = require('../src/services/crushChangeEntries');

// DEX-68: status and Feels changes become feed entries, so friends see "Crush → Dating" in The Tea's Feed.
const OWNER = '6aa2f82237d736a1196c9e1d';
const CRUSH_ID = '6ab000000000000000000001';
const crush = { _id: CRUSH_ID, userId: OWNER, status: 'Crush', relationshipLabels: ['Talking'] };

test('a status change records the old and new status', () => {
  const [entry] = changeEntriesFor({ userId: OWNER, crush, before: { status: 'Crush' }, after: { status: 'Dating' } });
  assert.strictEqual(entry.type, 'StatusChange');
  assert.strictEqual(entry.content, 'Dating');
  assert.strictEqual(entry.previousStatus, 'Crush');
  assert.strictEqual(entry.crushId, CRUSH_ID);
});

test('archiving or restoring a crush adds nothing to the feed', () => {
  assert.deepStrictEqual(changeEntriesFor({ userId: OWNER, crush, before: { status: 'Dating' }, after: { status: 'Archived' } }), []);
  assert.deepStrictEqual(changeEntriesFor({ userId: OWNER, crush, before: { status: 'Archived' }, after: { status: 'Dating' } }), []);
});

test('changing The Feels records the new and old labels', () => {
  const [entry] = changeEntriesFor({ userId: OWNER, crush, before: { relationshipLabels: ['Talking'] }, after: { relationshipLabels: ['Talking', 'Slow burn'] } });
  assert.strictEqual(entry.type, 'FeelsChange');
  assert.strictEqual(entry.content, 'Talking, Slow burn');
  assert.deepStrictEqual(entry.labels, ['Talking', 'Slow burn']);
  assert.deepStrictEqual(entry.previousLabels, ['Talking']);
});

test('re-saving the same Feels in a different order, or with blanks, adds nothing', () => {
  assert.deepStrictEqual(changeEntriesFor({ userId: OWNER, crush, before: { relationshipLabels: ['A', 'B'] }, after: { relationshipLabels: ['B', ' A ', ''] } }), []);
});

test('clearing every Feel is still a change', () => {
  const [entry] = changeEntriesFor({ userId: OWNER, crush, before: { relationshipLabels: ['Talking'] }, after: { relationshipLabels: [] } });
  assert.strictEqual(entry.type, 'FeelsChange');
  assert.strictEqual(entry.content, 'No Feels');
});

test('Feels changes on an archived crush add nothing', () => {
  const archived = { ...crush, status: 'Archived' };
  assert.deepStrictEqual(changeEntriesFor({ userId: OWNER, crush: archived, before: { relationshipLabels: [] }, after: { relationshipLabels: ['X'] } }), []);
});

test('fields that were not sent are not treated as changes', () => {
  assert.deepStrictEqual(changeEntriesFor({ userId: OWNER, crush, before: { status: 'Crush', relationshipLabels: ['Talking'] }, after: {} }), []);
});

let undo; let saved; let created;
beforeEach(() => {
  undo = pretendConnected();
  created = [];
  saved = { findById: CrushProfile.findById, findByIdAndUpdate: CrushProfile.findByIdAndUpdate, create: Entry.create };
  CrushProfile.findById = async () => ({ ...crush, visibility: [], toString() { return CRUSH_ID; } });
  CrushProfile.findByIdAndUpdate = async (_id, update) => ({ ...crush, ...update.$set, visibility: [] });
  Entry.create = async (doc) => { created.push(doc); return doc; };
});
afterEach(() => {
  undo();
  CrushProfile.findById = saved.findById; CrushProfile.findByIdAndUpdate = saved.findByIdAndUpdate; Entry.create = saved.create;
});

test('saving a crush with a new status and new Feels creates both feed entries', async () => {
  const res = fakeRes();
  await updateCrush(fakeReq({ userId: OWNER, params: { id: CRUSH_ID }, body: { status: 'Dating', relationshipLabels: ['Talking', 'Slow burn'] } }), res);
  assert.strictEqual(res.statusCode, 200, JSON.stringify(res.body));
  await new Promise((r) => setImmediate(r));
  assert.deepStrictEqual(created.map((e) => e.type).sort(), ['FeelsChange', 'StatusChange']);
  assert.strictEqual(created.find((e) => e.type === 'StatusChange').previousStatus, 'Crush');
});
