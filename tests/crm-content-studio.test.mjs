import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('crm.html');
const shell=read('js/admin_js/crm-shell.js');
test('CRM has its own stylesheet and landing dashboard',()=>{
 assert.match(html,/href="css\/admin_css\/crm-style\.css"/);
 assert.match(html,/id="crm-home-view" class="dashboard-view active"/);
 assert.match(shell,/switchView\('crm-home-view', homeNav\)/);
});
test('CRM navigation contains only CRM tasks',()=>{
 const nav=html.split('<ul class="nav-menu crm-navigation">')[1]?.split('</ul>')[0]||'';
 for(const view of ['crm-home-view','texts-view','galleries-view','export-view','maintenance-view']) assert.ok(nav.includes(view));
 for(const label of ['FRONTDESK','FINANCIËN','DATA & ANALYTICS','Mail Chain','Aanvragen']) assert.ok(!nav.includes(label),label);
});
test('existing content editing and export remain available',()=>{
 for(const path of ['admin-texts.js','admin-galleries.js','admin-export.js','crm-shell.js']) assert.ok(html.includes('js/admin_js/'+path));
 assert.ok(html.includes('id="export-view"'));
 assert.ok(html.includes('id="galleries-view"'));
 assert.ok(html.includes('id="texts-view"'));
});
