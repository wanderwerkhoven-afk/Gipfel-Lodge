import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../404.html', import.meta.url), 'utf8');

test('404 preview cards use the SPA recovery contract instead of broken deep links', () => {
  assert.ok(html.includes("recovery.searchParams.set('spa',page)"));
  assert.ok(html.includes("recovery.searchParams.set('spaPath'"));
  assert.ok(html.includes('a.href=recovery.pathname+recovery.search'));
});

test('404 fallback recognizes known routes and retains a genuine unknown-path 404', () => {
  assert.ok(html.includes('Object.prototype.hasOwnProperty.call(pages, route)'));
  assert.ok(html.includes("destination.searchParams.set('spa', pages[route])"));
  assert.ok(html.includes("if (!Object.prototype.hasOwnProperty.call(pages, route)) return;"));
});

test('404 cards and footer links are mapped consistently', () => {
  for (const page of ['home', 'lodge', 'activities', 'booking']) {
    assert.ok(html.includes('data-route="' + page + '"'));
  }
});
