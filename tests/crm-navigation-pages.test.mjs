import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('CRM provides separate navigable page views',()=>{
 const shell=read('js/admin_js/crm-shell.js'),html=read('crm.html');
 for(const slug of ['home','teksten','galerijen','publicatie','status'])assert.ok(shell.includes("'"+slug+"'"));
 assert.match(shell,/history\.pushState/);
 assert.match(shell,/popstate/);
 assert.match(html,/id="crm-page-breadcrumb"/);
});
test('existing editors and publishing are retained',()=>{
 const html=read('crm.html');
 for(const id of ['crm-home-view','texts-view','galleries-view','export-view','maintenance-view'])assert.ok(html.includes('id="'+id+'"'));
});
