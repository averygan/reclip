const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function pageWithFetch(fetchResponse) {
  const html = fs.readFileSync(path.join(__dirname, '../templates/index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);

  const elements = new Map();
  const element = (id = '') => ({ id, innerHTML: '', textContent: '', disabled: false,
    addEventListener() {}, appendChild(child) { elements.set(child.id, child); } });
  for (const id of ['urls', 'goBtn', 'cards']) elements.set(id, element(id));
  elements.get('urls').value = 'https://example.com/watch?list=broken';

  const requests = [];
  const context = vm.createContext({
    document: {
      getElementById: id => elements.get(id),
      createElement: () => element(),
    },
    fetch: async url => {
      requests.push(url);
      return fetchResponse();
    },
    console,
  });
  vm.runInContext(script, context);

  return { context, elements, requests };
}

async function expectPlaylistError(fetchResponse, message) {
  const { context, elements, requests } = pageWithFetch(fetchResponse);

  await context.go();
  assert.deepEqual(requests, ['/api/playlist']);
  assert.equal(elements.get('goBtn').disabled, false);
  assert.equal(elements.get('goBtn').textContent, 'Fetch');
  assert.equal(vm.runInContext('cardData[0].status', context), 'info-error');
  assert.match(vm.runInContext('cardData[0].error', context), message);
}

test('a network failure shows an error and leaves Fetch usable', async () => {
  await expectPlaylistError(async () => { throw new Error('Network unavailable'); }, /Network unavailable/);
});

test('a playlist API error does not fetch a misleading single video', async () => {
  await expectPlaylistError(async () => ({
    ok: false,
    json: async () => ({ error: 'Playlist is private' }),
  }), /Playlist is private/);
});
