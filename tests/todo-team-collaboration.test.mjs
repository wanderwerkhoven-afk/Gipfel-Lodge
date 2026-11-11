import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const todoSource = fs.readFileSync(
  new URL('../js/admin_js/dataviz/pages/todoPage.js', import.meta.url),
  'utf8'
);
const authSource = fs.readFileSync(
  new URL('../js/admin_js/admin-auth.js', import.meta.url),
  'utf8'
);
const rulesSource = fs.readFileSync(
  new URL('../firestore.rules', import.meta.url),
  'utf8'
);

test('team todo page subscribes to the complete todos collection', () => {
  assert.match(todoSource, /onSnapshot\(collection\(db, 'todos'\)/);
  assert.doesNotMatch(todoSource, /doc\(db, 'todos', targetUserId\)/);
  assert.match(todoSource, /selectedAssigneeId = 'all'/);
});

test('employees can assign a new task to a colleague', () => {
  assert.match(todoSource, /id="newTodoAssignee"/);
  assert.match(todoSource, /assigneeUserId/);
  assert.match(todoSource, /createdBy: window\.currentUser\.uid/);
  assert.match(todoSource, /addDoc\(collection\(db, 'todos'\)/);
});

test('legacy personal todo arrays remain readable and editable', () => {
  assert.match(todoSource, /Array\.isArray\(data\.items\)/);
  assert.match(todoSource, /source: 'legacy'/);
  assert.match(todoSource, /legacyItemsByUser/);
});

test('all authenticated employees receive the safe staff directory', () => {
  assert.match(authSource, /Load the shared staff directory/);
  assert.match(authSource, /getDocs\(collection\(db, 'users'\)\)/);
  assert.doesNotMatch(
    authSource,
    /if \(currentUserRole === 'superuser'\) \{[\s\S]*?getDocs\(collection\(db, 'users'\)\)/
  );
  assert.doesNotMatch(authSource, /window\.allUsers\.push\([\s\S]*?email:/);
});

test('Firestore grants the shared board only to registered staff', () => {
  assert.match(rulesSource, /function isStaff\(\)/);
  assert.match(rulesSource, /match \/todos\/\{todoId\}/);
  assert.match(rulesSource, /allow read: if isStaff\(\)/);
  assert.match(rulesSource, /request\.resource\.data\.createdBy == request\.auth\.uid/);
  assert.match(rulesSource, /request\.resource\.data\.text\.size\(\) <= 500/);
});
