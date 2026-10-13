import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('rental admin and website CRM link to one another',()=>{
 assert.match(read('admin.html'),/href="crm\.html"/);
 assert.match(read('crm.html'),/href="admin\.html"/);
});
test('CRM opens content management while admin opens bookings',()=>{
 assert.match(read('crm.html'),/id="texts-view" class="dashboard-view active"/);
 assert.match(read('admin.html'),/id="bookings-view" class="dashboard-view active"/);
 assert.match(read('crm.html'),/id="export-view"/);
 assert.match(read('crm.html'),/js\/admin_js\/admin-export\.js/);
});
test('both pages are included in restricted management build',()=>{
 const build=read('build-siteground.ps1');
 assert.match(build,/Copy-Item "\$Root\\admin\.html"/);
 assert.match(build,/Copy-Item "\$Root\\crm\.html"/);
});
