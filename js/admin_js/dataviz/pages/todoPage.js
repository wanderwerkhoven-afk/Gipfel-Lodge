import { db, doc, onSnapshot, setDoc } from '../../../site_js/core/firebase.js';

let currentTodos = [];
let targetUserId = null;
let unsubscribeSnapshot = null;

export const TodoPage = {
  id: "todo",
  title: "TO-DO's",
  template: () => {
    return `
    <div class="eb2-page-header">
      <div>
        <h1>Actiepunten</h1>
        <p>Beheer je taken en to-do's — synchroniseert automatisch met alle gebruikers.</p>
      </div>
    </div>

    <div class="eb2-content-wrapper">

      <!-- User pill selector (superuser only) -->
      <div id="superuser-select-container"></div>

      <!-- Add task card -->
      <div class="eb2-section-card todo-add-card">
        <div class="eb2-section-header" style="padding-bottom: 16px;">
          <div>
            <h2 class="eb2-section-title">Nieuwe taak toevoegen</h2>
          </div>
        </div>
        <div class="todo-input-row">
          <input type="text" id="newTodoInput" class="todo-input" placeholder="Wat moet er gebeuren?" />
          <select id="newTodoPriority" class="todo-priority-select">
            <option value="low">⬇ Laag</option>
            <option value="medium" selected>➡ Normaal</option>
            <option value="high">⬆ Hoog</option>
          </select>
          <button id="addTodoBtn" class="todo-add-btn">
            <i class="ph ph-plus-circle"></i> Toevoegen
          </button>
        </div>
      </div>

      <!-- Task list card -->
      <div class="eb2-section-card" style="margin-top: 20px; overflow: visible;">
        <div class="eb2-section-header" style="padding-bottom: 0;">
          <h2 class="eb2-section-title">Openstaande taken</h2>
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
    targetUserId = window.currentUser?.uid;

    if (!targetUserId) {
      console.warn("No user ID found, cannot load todos.");
      return;
    }

    if (window.currentUserRole === 'superuser' && window.allUsers && window.allUsers.length > 0) {
      renderUserPills();
    }

    document.getElementById("addTodoBtn")?.addEventListener("click", addTodo);
    document.getElementById("newTodoInput")?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") addTodo();
    });

    subscribeToFirebase();
  }
};

function subscribeToFirebase() {
  if (!targetUserId) return;

  if (unsubscribeSnapshot) unsubscribeSnapshot();

  const listEl = document.getElementById("todoList");
  if (listEl) listEl.innerHTML = `<li class="todo-empty"><i class="ph ph-spinner"></i> Synchroniseren...</li>`;

  const docRef = doc(db, 'todos', targetUserId);
  unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
    currentTodos = docSnap.exists() ? (docSnap.data().items || []) : [];
    renderTodos();
  }, (error) => {
    console.error("Fout bij ophalen van to-do lijst:", error);
    if (listEl) listEl.innerHTML = `<li class="todo-empty" style="color:#ef4444;"><i class="ph ph-warning-circle"></i> Fout bij laden van data.</li>`;
  });
}

function renderUserPills() {
  const container = document.getElementById("superuser-select-container");
  if (!container) return;

  const pillsHtml = window.allUsers.map(u => {
    const isActive = u.uid === targetUserId;
    return `<button
      class="todo-user-pill ${isActive ? 'todo-user-pill--active' : ''}"
      data-uid="${u.uid}"
    >${u.displayName}</button>`;
  }).join('');

  container.innerHTML = `
    <div class="eb2-section-card todo-user-card">
      <p class="todo-user-label"><i class="ph ph-users"></i> Weergeven voor:</p>
      <div class="todo-user-pills">${pillsHtml}</div>
    </div>`;

  container.querySelectorAll('.todo-user-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      targetUserId = btn.dataset.uid;
      renderUserPills();
      subscribeToFirebase();
    });
  });
}

async function saveTodosToFirebase() {
  if (!targetUserId) return;
  try {
    const docRef = doc(db, 'todos', targetUserId);
    await setDoc(docRef, { items: currentTodos }, { merge: true });
  } catch (error) {
    console.error("Kon to-do lijst niet opslaan:", error);
    alert("Kon taak niet opslaan. Controleer je internetverbinding.");
  }
}

function addTodo() {
  const input = document.getElementById("newTodoInput");
  const prio = document.getElementById("newTodoPriority");
  if (!input || !prio || !input.value.trim()) return;

  currentTodos.push({
    id: Date.now().toString() + Math.floor(Math.random() * 1000),
    text: input.value.trim(),
    priority: prio.value,
    completed: false,
    date: new Date().toISOString()
  });

  input.value = "";
  saveTodosToFirebase();
}

window.toggleTodoItem = function(id) {
  const todo = currentTodos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodosToFirebase();
  }
};

window.deleteTodoItem = function(id) {
  currentTodos = currentTodos.filter(t => t.id !== id);
  saveTodosToFirebase();
};

const PRIO_CONFIG = {
  high:   { label: 'Hoog',   color: '#ef4444', bg: '#fee2e2', icon: 'ph-arrow-up'    },
  medium: { label: 'Normaal', color: '#f59e0b', bg: '#fef3c7', icon: 'ph-minus'      },
  low:    { label: 'Laag',   color: '#64748b', bg: '#f1f5f9', icon: 'ph-arrow-down'  },
};

function renderTodos() {
  const list = document.getElementById("todoList");
  if (!list) return;

  // Update count badge
  const openCount = currentTodos.filter(t => !t.completed).length;
  const badge = document.getElementById("todo-count-badge");
  if (badge) badge.textContent = openCount;

  if (currentTodos.length === 0) {
    list.innerHTML = `<li class="todo-empty"><i class="ph ph-check-circle"></i> Geen openstaande taken. Goed bezig!</li>`;
    return;
  }

  const prioWeight = { high: 3, medium: 2, low: 1 };
  const sorted = [...currentTodos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (prioWeight[a.priority] !== prioWeight[b.priority]) return prioWeight[b.priority] - prioWeight[a.priority];
    return new Date(b.date) - new Date(a.date);
  });

  list.innerHTML = '';

  sorted.forEach(t => {
    const prio = PRIO_CONFIG[t.priority] || PRIO_CONFIG.low;
    const dateStr = new Date(t.date).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });

    const li = document.createElement("li");
    li.className = `todo-item${t.completed ? ' todo-item--done' : ''}`;
    li.innerHTML = `
      <label class="todo-checkbox-wrap">
        <input type="checkbox" class="todo-checkbox" ${t.completed ? 'checked' : ''} data-id="${t.id}">
        <span class="todo-checkmark"></span>
      </label>
      <div class="todo-body">
        <span class="todo-text">${escapeHtml(t.text)}</span>
        <div class="todo-meta">
          <span class="todo-badge" style="color:${prio.color}; background:${prio.bg};">
            <i class="ph ${prio.icon}"></i> ${prio.label}
          </span>
          <span class="todo-date"><i class="ph ph-calendar-blank"></i> ${dateStr}</span>
        </div>
      </div>
      <button class="todo-del-btn" data-id="${t.id}" title="Verwijder taak">
        <i class="ph ph-trash"></i>
      </button>
    `;

    li.querySelector('.todo-checkbox').addEventListener('change', () => window.toggleTodoItem(t.id));
    li.querySelector('.todo-del-btn').addEventListener('click', () => window.deleteTodoItem(t.id));

    list.appendChild(li);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
