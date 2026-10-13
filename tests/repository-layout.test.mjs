import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
test('generated bundles are excluded from source control', () => {
 const ignore=read('.gitignore');
 assert.match(ignore, /^siteground_upload\/$/m);
 assert.match(ignore, /^beheer\/$/m);
});
test('public and admin entrypoints and required build tool are retained', () => {
 for(const path of ['index.html','admin.html','build-siteground.ps1','build-images-index.js']){
  assert.ok(existsSync(new URL('../'+path, import.meta.url)), path);
 }
});
