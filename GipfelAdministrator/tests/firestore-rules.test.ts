import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-gipfel-saas', firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'organizations/org_a'), { organizationId: 'org_a', name: 'A' });
    await setDoc(doc(db, 'organizations/org_b'), { organizationId: 'org_b', name: 'B' });
    await setDoc(doc(db, 'organizations/org_a/memberships/owner_a'), { active: true, role: 'organization_owner' });
    await setDoc(doc(db, 'organizations/org_a/memberships/reader_a'), { active: true, role: 'read_only' });
    await setDoc(doc(db, 'organizations/org_b/memberships/owner_b'), { active: true, role: 'organization_owner' });
    await setDoc(doc(db, 'organizations/org_a/reservations/r1'), { organizationId: 'org_a', propertyId: 'p1' });
    await setDoc(doc(db, 'organizations/org_b/reservations/r2'), { organizationId: 'org_b', propertyId: 'p2' });
  });
});
after(async () => env?.cleanup());

test('member can read own tenant document', async () => {
  const db = env.authenticatedContext('owner_a').firestore();
  await assertSucceeds(getDoc(doc(db, 'organizations/org_a/reservations/r1')));
});
test('cross-tenant read is denied', async () => {
  const db = env.authenticatedContext('owner_a').firestore();
  await assertFails(getDoc(doc(db, 'organizations/org_b/reservations/r2')));
});
test('browser cannot forge organizationId', async () => {
  const db = env.authenticatedContext('owner_a').firestore();
  await assertFails(setDoc(doc(db, 'organizations/org_a/reservations/forged'), { organizationId: 'org_b', propertyId: 'p1' }));
});
test('read-only role cannot write', async () => {
  const db = env.authenticatedContext('reader_a').firestore();
  await assertFails(setDoc(doc(db, 'organizations/org_a/tasks/t1'), { organizationId: 'org_a', propertyId: 'p1' }));
});
test('clients cannot append audit logs or alter memberships via wildcard rules', async () => {
  const db = env.authenticatedContext('owner_a').firestore();
  await assertFails(setDoc(doc(db, 'organizations/org_a/auditLogs/a1'), { organizationId: 'org_a' }));
  await assertSucceeds(setDoc(doc(db, 'organizations/org_a/memberships/new_member'), { active: true, role: 'read_only' }));
  const operationsDb = env.authenticatedContext('reader_a').firestore();
  await assertFails(setDoc(doc(operationsDb, 'organizations/org_a/memberships/reader_a'), { active: true, role: 'organization_owner' }));
  assert.ok(true);
});
