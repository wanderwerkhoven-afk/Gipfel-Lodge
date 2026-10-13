import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const exportCode=readFileSync(new URL('../js/admin_js/admin-export.js',import.meta.url),'utf8');
test('export no longer reads generated build manifests',()=>{
 assert.doesNotMatch(exportCode,/fetch\(sgBase \+ 'js\/site-manifest\.json/);
 assert.match(exportCode,/loadGitHubSiteSources\(\)/);
});
test('export fetches immutable source and fails rather than dropping assets',()=>{
 assert.match(exportCode,/commits\/.*GIPFEL_SOURCE_REF/);
 assert.match(exportCode,/commitSha/);
 assert.match(exportCode,/if \(tree\.truncated\) throw/);
 assert.match(exportCode,/Verplicht bronbestand ontbreekt/);
 assert.doesNotMatch(exportCode,/Kon niet kopiëren/);
});
test('admin and CRM files are excluded from public archive',()=>{
 assert.match(exportCode,/function mapPublicSiteFile/);
 assert.match(exportCode,/path\.startsWith\('css\/site_css\/'\)/);
 assert.match(exportCode,/path\.startsWith\('js\/site_js\/'\)/);
 assert.doesNotMatch(exportCode,/path\.startsWith\('js\/admin_js\/'\)/);
});
test('export retains SPA translations and PHP entrypoint priority',()=>{
 assert.match(exportCode,/Retain data-i18n/);
 assert.match(exportCode,/DirectoryIndex index.php index.html/);
 assert.match(exportCode,/zip\.file\('index\.php', finalPhp\)/);
});
