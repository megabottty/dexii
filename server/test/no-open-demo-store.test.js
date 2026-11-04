const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// The demo crush store answered without signing in, so anyone could read or write crushes by username (DEX-58).
test('the server no longer mounts the open demo crush store', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.js'), 'utf8');
  assert.ok(!index.includes('/api/demo/crushes'), '/api/demo/crushes is still mounted');
  assert.ok(!fs.existsSync(path.join(__dirname, '..', 'src', 'routes', 'demoCrushes.js')), 'routes/demoCrushes.js still exists');
});
