import {
  db,
  collection,
  addDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from '../../../site_js/core/firebase.js';

let teamTodos = [];
let selectedAssigneeId = 'all';
let unsubscribeSnapshot = null;
let legacyItemsByUser = new Map();

export const TodoPage = {
  id: "todo",
  title: "TO-DO's",
  template: () => {
    return `
    <div class="eb2-page-header">
      <div>
        <h1>Teamtaken</h1>
        <p>Bekijk de to-do's van het hele team en wijs nieuwe taken direct aan een medewerker toe.</p>
      </div>
    </div>

    <div class="eb2-content-wrapper">

      <!-- Shared employee filter -->
      <div id="todo-team-filter-container"></div>

      <!-- Add task card -->
      <div class="eb2-section-card todo-add-card">
        <div class="eb2-section-header" style="padding-bottom: 16px;">
          <div>
            <h2 class="eb2-section-title">Nieuwe teamtaak toevoegen</h2>
            <p class="todo-section-description">Iedere medewerker kan een taak voor zichzelf of een collega aanmaken.</p>
          </div>
        </div>
        <div class="todo-input-row">
          <input type="text" id="newTodoInput" class="todo-input" placeholder="Wat moet er gebeuren?" />
          <select id="newTodoAssignee" class="todo-assignee-select" aria-label="Toewijzen aan medewerker"></select>
          <select id="newTodoPriority" class="todo-priority-select" aria-label="Prioriteit">
            <option value="low">⬇ Laag</option>
            <option value="medium" selected>➡ Normaal</option>
            <option value="high">⬆ Hoog</option>
          </select>
          <button id="addTodoBtn" class="todo-add-btn">
            <i class="ph ph-plus-circle"></i> Taak toevoegen
          </button>
        </div>
      </div>

      <!-- Shared task list card -->
      <div class="eb2-section-card" style="margin-top: 20px; overflow: visible;">
        <div class="eb2-section-header" style="padding-bottom: 0;">
          <div>
            <h2 class="eb2-section-title" id="todo-list-title">Openstaande teamtaken</h2>
            <p class="todo-section-description" id="todo-list-description">Alle taken van alle medewerkers</p>
          </div>
          <span id="todo-count-badge" class="todo-count-badge">0</span>
        </div>
        <ul id="todoList" class="todo-list">
          <li class="todo-empty">Laden...</li>
        </ul>
      </div>

    </div>
  `;
  },

  init: async () => {
    if (!window.currentUser?.uid) {
      console.warn("No user ID found, cannot load team todos.");
      return;
    }

    renderTeamControls();

    document.getElementById("addTodoBtn")?.addEventListener("click", addTodo);
    document.getElementById("newTodoInput")?.addEventListener("keypress", event => {
      if (event.key === "Enter") addTodo();
    });

    subscribeToTeamTodos();
  }
};

function getStaffUsers() {
  const users = Array.isArray(window.allUsers) ? [...window.allUsers] : [];
  const currentUserId = window.currentUser?.uid;

  if (currentUserId && !users.some(user => user.uid === currentUserId)) {
    users.push({
      uid: currentUserId,
      displayName: window.currentUserName || window.currentUser?.email?.split('@')[0] || 'Ik',
      role: window.currentUserRole || 'user'
    });
  }

  return users
    .filter(user => user?.uid)
    .sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || ''), 'nl'));
}

function getStaffName(userId) {
  if (!userId) return 'Niet toegewezen';
  const user = getStaffUsers().find(staffUser => staffUser.uid === userId);
  if (user) return user.displayName;
  if (userId === window.currentUser?.uid) return window.currentUserName || 'Ik';
  return 'Onbekende medewerker';
}

function renderTeamControls() {
  const container = document.getElementById("todo-team-filter-container");
  const assigneeSelect = document.getElementById("newTodoAssignee");
  const users = getStaffUsers();

  if (container) {
    const allActive = selectedAssigneeId === 'all';
    const userPills = users.map(user => `
      <button
        type="button"
        class="todo-user-pill ${selectedAssigneeId === user.uid ? 'todo-user-pill--active' : ''}"
        data-assignee-id="${escapeHtml(user.uid)}"
      >
        <i class="ph ph-user"></i>
        ${escapeHtml(user.displayName || 'Medewerker')}
      </button>
    `).join('');

    container.innerHTML = `
      <div class="eb2-section-card todo-user-card">
        <p class="todo-user-label"><i class="ph ph-users-three"></i> Taken weergeven voor:</p>
        <div class="todo-user-pills">
          <button
            type="button"
            class="todo-user-pill ${allActive ? 'todo-user-pill--active' : ''}"
            data-assignee-id="all"
          >
            <i class="ph ph-squares-four"></i> Hele team
          </button>
          ${userPills}
        </div>
      </div>
    `;

    container.querySelectorAll('.todo-user-pill').forEach(button => {
      button.addEventListener('click', () => {
        selectedAssigneeId = button.dataset.assigneeId || 'all';
        renderTeamControls();
        renderTodos();
      });
    });
  }

  if (assigneeSelect) {
    const previousValue = assigneeSelect.value || window.currentUser?.uid || users[0]?.uid || '';
    assigneeSelect.innerHTML = users.map(user => `
      <option value="${escapeHtml(user.uid)}">${escapeHtml(user.displayName || 'Medewerker')}</option>
    `).join('');

    if (users.some(user => user.uid === previousValue)) {
      assigneeSelect.value = previousValue;
    } else if (window.currentUser?.uid && users.some(user => user.uid === window.currentUser.uid)) {
      assigneeSelect.value = window.currentUser.uid;
    }
  }
}

function subscribeToTeamTodos() {
  if (unsubscribeSnapshot) unsubscribeSnapshot();

  const listEl = document.getElementById("todoList");
  if (listEl) {
    listEl.innerHTML = `<li class="todo-empty"><i class="ph ph-spinner"></i> Teamtaken synchroniseren...</li>`;
  }

  unsubscribeSnapshot = onSnapshot(collection(db, 'todos'), snapshot => {
    const normalizedTodos = [];
    legacyItemsByUser = new Map();

    snapshot.forEach(todoDocument => {
      const data = todoDocument.data();

      // Backwards compatibility: the former model stored an items array in todos/{userId}.
      if (Array.isArray(data.items)) {
        legacyItemsByUser.set(todoDocument.id, data.items);

        data.items.forEach((item, index) => {
          normalizedTodos.push({
            id: String(item.id || `${todoDocument.id}-${index}`),
            firestoreDocId: todoDocument.id,
            source: 'legacy',
            text: item.text || '',
            priority: item.priority || 'low',
            completed: Boolean(item.completed),
            assigneeUserId: todoDocument.id,
            assigneeName: getStaffName(todoDocument.id),
            createdBy: item.createdBy || '',
            createdByName: item.createdByName || '',
            date: item.date || ''
          });
        });
        return;
      }

      // New collaborative model: one Firestore document per task.
      if (!data.text) return;

      normalizedTodos.push({
        id: todoDocument.id,
        firestoreDocId: todoDocument.id,
        source: 'document',
        text: data.text,
        priority: data.priority || 'low',
        completed: Boolean(data.completed),
        assigneeUserId: data.assigneeUserId || '',
        assigneeName: data.assigneeName || getStaffName(data.assigneeUserId),
        createdBy: data.createdBy || '',
        createdByName: data.createdByName || getStaffName(data.createdBy),
        date: data.createdAtIso || timestampToIso(data.createdAt)
      });
    });

    teamTodos = normalizedTodos;
    renderTeamControls();
    renderTodos();
  }, error => {
    console.error("Fout bij ophalen van teamtaken:", error);
    if (listEl) {
      listEl.innerHTML = `<li class="todo-empty" style="color:#ef4444;"><i class="ph ph-warning-circle"></i> Teamtaken konden niet worden geladen.</li>`;
    }
  });
}

async function addTodo() {
  const input = document.getElementById("newTodoInput");
  const prioritySelect = document.getElementById("newTodoPriority");
  const assigneeSelect = document.getElementById("newTodoAssignee");
  const addButton = document.getElementById("addTodoBtn");

  const text = input?.value.trim();
  const assigneeUserId = assigneeSelect?.value;
  if (!text || !assigneeUserId || !window.currentUser?.uid) return;

  const assignedUser = getStaffUsers().find(user => user.uid === assigneeUserId);
  if (!assignedUser) {
    alert("Selecteer een geldige medewerker.");
    return;
  }

  try {
    if (addButton) addButton.disabled = true;

    await addDoc(collection(db, 'todos'), {
      text,
      priority: prioritySelect?.value || 'medium',
      completed: false,
      assigneeUserId,
      assigneeName: assignedUser.displayName || 'Medewerker',
      createdBy: window.currentUser.uid,
      createdByName: window.currentUserName || window.currentUser.email?.split('@')[0] || 'Medewerker',
      createdAt: serverTimestamp(),
      createdAtIso: new Date().toISOString()
    });

    input.value = "";
    input.focus();
  } catch (error) {
    console.error("Kon teamtaak niet opslaan:", error);
    alert("Kon taak niet opslaan. Controleer je internetverbinding.");
  } finally {
    if (addButton) addButton.disabled = false;
  }
}

async function toggleTodo(todo) {
  const nextCompletedState = !todo.completed;

  try {
    if (todo.source === 'legacy') {
      const items = [...(legacyItemsByUser.get(todo.firestoreDocId) || [])];
      const itemIndex = items.findIndex(item => String(item.id) === String(todo.id));
      if (itemIndex === -1) return;

      items[itemIndex] = {
        ...items[itemIndex],
        completed: nextCompletedState,
        completedBy: window.currentUser?.uid || '',
        completedAt: nextCompletedState ? new Date().toISOString() : null
      };

      await setDoc(doc(db, 'todos', todo.firestoreDocId), { items }, { merge: true });
      return;
    }

    await updateDoc(doc(db, 'todos', todo.firestoreDocId), {
      completed: nextCompletedState,
      completedBy: window.currentUser?.uid || '',
      completedAt: nextCompletedState ? serverTimestamp() : null
    });
  } catch (error) {
    console.error("Kon taakstatus niet bijwerken:", error);
    alert("Kon de taakstatus niet bijwerken.");
  }
}

async function removeTodo(todo) {
  if (!confirm(`Taak “${todo.text}” verwijderen?`)) return;

  try {
    if (todo.source === 'legacy') {
      const items = [...(legacyItemsByUser.get(todo.firestoreDocId) || [])]
        .filter(item => String(item.id) !== String(todo.id));
      await setDoc(doc(db, 'todos', todo.firestoreDocId), { items }, { merge: true });
      return;
    }

    await deleteDoc(doc(db, 'todos', todo.firestoreDocId));
  } catch (error) {
    console.error("Kon taak niet verwijderen:", error);
    alert("Kon de taak niet verwijderen.");
  }
}

const PRIO_CONFIG = {
  high: { label: 'Hoog', color: '#ef4444', bg: '#fee2e2', icon: 'ph-arrow-up' },
  medium: { label: 'Normaal', color: '#f59e0b', bg: '#fef3c7', icon: 'ph-minus' },
  low: { label: 'Laag', color: '#64748b', bg: '#f1f5f9', icon: 'ph-arrow-down' }
};

function renderTodos() {
  const list = document.getElementById("todoList");
  if (!list) return;

  const visibleTodos = selectedAssigneeId === 'all'
    ? [...teamTodos]
    : teamTodos.filter(todo => todo.assigneeUserId === selectedAssigneeId);

  const openCount = visibleTodos.filter(todo => !todo.completed).length;
  const badge = document.getElementById("todo-count-badge");
  if (badge) badge.textContent = openCount;

  const listTitle = document.getElementById("todo-list-title");
  const listDescription = document.getElementById("todo-list-description");
  if (selectedAssigneeId === 'all') {
    if (listTitle) listTitle.textContent = 'Openstaande teamtaken';
    if (listDescription) listDescription.textContent = 'Alle taken van alle medewerkers';
  } else {
    const selectedName = getStaffName(selectedAssigneeId);
    if (listTitle) listTitle.textContent = `Taken van ${selectedName}`;
    if (listDescription) listDescription.textContent = `Openstaande en afgeronde taken voor ${selectedName}`;
  }

  if (visibleTodos.length === 0) {
    list.innerHTML = `<li class="todo-empty"><i class="ph ph-check-circle"></i> Geen taken in deze selectie. Goed bezig!</li>`;
    return;
  }

  const priorityWeight = { high: 3, medium: 2, low: 1 };
  visibleTodos.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    return taskDateValue(b) - taskDateValue(a);
  });

  list.innerHTML = '';

  visibleTodos.forEach(todo => {
    const priority = PRIO_CONFIG[todo.priority] || PRIO_CONFIG.low;
    const assigneeName = todo.assigneeName || getStaffName(todo.assigneeUserId);
    const creatorName = todo.createdByName || getStaffName(todo.createdBy);
    const dateString = formatTaskDate(todo.date);

    const item = document.createElement("li");
    item.className = `todo-item${todo.completed ? ' todo-item--done' : ''}`;
    item.innerHTML = `
      <label class="todo-checkbox-wrap" title="Markeer taak als ${todo.completed ? 'openstaand' : 'afgerond'}">
        <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
        <span class="todo-checkmark"></span>
      </label>
      <div class="todo-body">
        <span class="todo-text">${escapeHtml(todo.text)}</span>
        <div class="todo-meta">
          <span class="todo-badge" style="color:${priority.color}; background:${priority.bg};">
            <i class="ph ${priority.icon}"></i> ${priority.label}
          </span>
          <span class="todo-assignee-badge">
            <i class="ph ph-user-circle"></i> ${escapeHtml(assigneeName)}
          </span>
          ${dateString ? `<span class="todo-date"><i class="ph ph-calendar-blank"></i> ${dateString}</span>` : ''}
          ${todo.createdBy ? `<span class="todo-created-by">Door ${escapeHtml(creatorName)}</span>` : ''}
        </div>
      </div>
      <button class="todo-del-btn" type="button" title="Verwijder taak">
        <i class="ph ph-trash"></i>
      </button>
    `;

    item.querySelector('.todo-checkbox')?.addEventListener('change', () => toggleTodo(todo));
    item.querySelector('.todo-del-btn')?.addEventListener('click', () => removeTodo(todo));
    list.appendChild(item);
  });
}

function timestampToIso(value) {
  if (!value) return '';
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return '';
}

function taskDateValue(todo) {
  const value = Date.parse(todo.date || '');
  return Number.isNaN(value) ? 0 : value;
}

function formatTaskDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
