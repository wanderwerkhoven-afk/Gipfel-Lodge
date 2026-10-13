import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('mobile drawer and backdrop are portaled to body on iOS',()=>{
 const s=read('js/admin_js/crm-shell.js');
 assert.match(s,/function syncCrmMenuPortal/);
 assert.match(s,/document\.body\.appendChild\(side\)/);
 assert.match(s,/document\.body\.appendChild\(overlay\)/);
 assert.match(s,/syncCrmMenuPortal\(\);/);
});
test('body-level CRM drawer outranks its backdrop',()=>{
 const css=read('css/admin_css/crm-style.css');
 assert.match(css,/body > #dashboard-sidebar\.active/);
 assert.match(css,/z-index:2147483001!important/);
 assert.match(css,/z-index:2147483000!important/);
});
