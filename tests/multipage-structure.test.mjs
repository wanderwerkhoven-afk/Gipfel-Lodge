import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pages = ['home', 'lodge', 'activities', 'enjoyment', 'booking'];

test('shared layout contains a single page mount and no embedded page content', () => {
  const layout = read('src/layout.html');
  assert.equal(layout.split('<!-- MPA_PAGE_MOUNT -->').length - 1, 1);
  for (const page of pages) assert.ok(!layout.includes('id="' + page + '-page"'));
});

for (const page of pages) {
  test(page + ' has a standalone HTML template', () => {
    const html = read('src/pages/' + page + '.html');
    assert.ok(html.includes('id="' + page + '-page"'));
    assert.equal(html.split('<main ').length - 1, 1);
    assert.equal(html.split('</main>').length - 1, 1);
  });
}

test('legacy SiteGround entrypoint remains intact', () => {
  const html = read('index.html');
  assert.ok(html.includes('id="home-page"'));
  assert.ok(html.includes('id="booking-page"'));
  assert.ok(read('js/admin_js/admin-export.js').includes("sourceBase + 'index.html'"));
});
