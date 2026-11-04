const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
require('./helpers');

const dir = path.join(__dirname, '..', 'src', 'controllers');

test('every controller loads', () => {
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    assert.doesNotThrow(() => require(path.join(dir, file)), `${file} failed to load`);
  }
});
