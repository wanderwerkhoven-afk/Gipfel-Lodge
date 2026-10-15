import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pages = ['home', 'lodge', 'activities', 'enjoyment', 'booking'];

test('shared MPA layout has exactly one insertion marker and no embedded pages', () => {
  const layout = read('src/layout.html');
  assert.equal(layout.split('MPA_PAGE_MOUNT').length - 1, 1);
  assert.doesNotMatch(layout, /<main\\b[^>]*class=["'][^"']*\\bpage\\b/);
});

for (const page of pages) {
  test(page + ' template has its own unique main element', () => {
    const html = read('src/pages/' + page + '.html');
    assert.match(html, new RegExp('<main\\\\b[^>]*id=["\\']' + page + '-page["\\']'));
    assert.equal((html.match(/<main\\b/g) || []).length, 1);
    assert.equal((html.match(/<\\/main>/g) || []).length, 1);
  });
}

test('legacy entrypoint remains available for existing SiteGround export', () => {
  assert.match(read('index.html'), /id=["']home-page["']/);
  assert.match(read('index.html'), /id=["']booking-page["']/);
  assert.match(read('js/admin_js/admin-export.js'), /sourceBase \\+ 'index\\.html'/);
});
