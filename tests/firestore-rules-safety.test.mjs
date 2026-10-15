import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rules = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

test('Firestore rules default to deny', () => {
  assert.ok(rules.includes('match /{document=**}'));
  assert.ok(rules.includes('allow read, write: if false;'));
});

test('bookings are not publicly readable', () => {
  const start = rules.indexOf('match /bookings/{bookingId}');
  const end = rules.indexOf('match /public_availability/', start);
  assert.ok(start >= 0 && end > start);
  const block = rules.slice(start, end);
  assert.ok(block.includes('allow read, update, delete: if isAdmin();'));
});

test('public availability is not publicly editable after creation', () => {
  const start = rules.indexOf('match /public_availability/');
  const end = rules.indexOf('match /audit_logs/', start);
  assert.ok(start >= 0 && end > start);
  assert.ok(rules.slice(start, end).includes('allow update, delete: if isAdmin();'));
});
