const { test } = require('node:test');
const assert = require('node:assert');
const { personName } = require('../src/utils/personName');

test('personName prefers a chosen display name, then first and last name, then username', () => {
  assert.strictEqual(personName({ username: 'mgrange', profileSettings: { displayName: 'Shelly' } }), 'Shelly');
  assert.strictEqual(personName({ username: 'mgrange', displayName: 'mgrange', firstName: 'Michelle' }), 'Michelle');
  assert.strictEqual(personName({ username: 'mgrange' }), 'mgrange');
});

test('personName never returns an email address as a name', () => {
  assert.strictEqual(personName({ username: 'mgrange', displayName: 'michelle@example.com', firstName: 'Michelle' }), 'Michelle');
  assert.strictEqual(personName({ username: 'michelle@example.com' }), 'A friend');
});

test('push notifications name the sender by their chosen name, never an email', () => {
  const { pushCopy } = require('../src/controllers/notificationController');
  const nudge = (actor) => pushCopy('friend_request_nudge', actor).body;
  assert.match(nudge({ username: 'mgrange', profileSettings: { displayName: 'Shelly' } }), /^Shelly /);
  assert.match(nudge({ username: 'mgrange', firstName: 'Michelle', displayName: 'michelle@example.com' }), /^Michelle /);
});
