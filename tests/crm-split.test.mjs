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

test('CRM no longer loads rental, finance or analytics runtime modules',()=>{
 const crm=read('crm.html');
 for(const name of ['admin-bookings.js','admin-pricing.js','admin-invoices.js','admin-import.js','admin-behavior.js','admin-logs.js','admin-ui.js']){
   assert.ok(!crm.includes('src="js/admin_js/'+name+'"'),name);
 }
 assert.match(crm,/src="js\/admin_js\/crm-shell\.js"/);
 assert.match(crm,/src="js\/admin_js\/admin-auth\.js"/);
});
test('rental admin does not load website content publishing modules',()=>{
 const admin=read('admin.html');
 for(const name of ['admin-texts.js','admin-galleries.js','admin-export.js']){
   assert.ok(!admin.includes('src="js/admin_js/'+name+'"'),name);
 }
});
