import { db, doc, onSnapshot, setDoc } from '../../../site_js/core/firebase.js';

let currentTodos = [];
let targetUserId = null;
let unsubscribeSnapshot = null;

export const TodoPage = {
  id: "todo",
  title: "TO-DO's",
  template: () => {
    let superuserSelectHtml = '';
    
    // Check if the user is a superuser and allUsers list is populated
    if (window.currentUserRole === 'superuser' && window.allUsers && window.allUsers.length > 0) {
      const optionsHtml = window.allUsers.map(u => 
        `<option value="${u.uid}" ${u.uid === window.currentUser?.uid ? 'selected' : ''}>${u.displayName}'s To-Do's (${u.email})</option>`
      ).join('');
      
      superuserSelectHtml = `
        <div class="panel" style="margin-bottom: 20px; padding: 15px;">
          <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 8px;">Selecteer To-Do Lijst (Superuser)</label>
          <select id="todo-user-select" class="form-control" style="width: 100%; max-width: 400px; padding: 8px;">
            ${optionsHtml}
          </select>
        </div>
      `;
    }

    return `
    <div class="container slide-up">
      <div class="page-head">
        <div>
          <h2 class="page-title">Actiepunten</h2>
          <p class="page-subtitle">Beheer je taken en to-do's (Synchroniseert automatisch)</p>
        </div>
      </div>

      <section class="content-section" style="max-width: 600px; margin: 0 auto;">
        ${superuserSelectHtml}

        <div class="panel">
          <div class="panel-header">
            <h3 class="panel-title">Nieuwe taak toevoegen</h3>
          </div>
          <div class="panel__body" style="display: flex; gap: 10px;">
            <input type="text" id="newTodoInput" class="form-control" placeholder="Wat moet er gebeuren?" style="flex: 1;" />
            <select id="newTodoPriority" class="form-control" style="width: 120px;">
              <option value="low">Laag</option>
              <option value="medium" selected>Normaal</option>
              <option value="high">Hoog</option>
            </select>
            <button id="addTodoBtn" class="btn btn-primary" style="background: var(--accent); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;">
              Toevoegen
            </button>
          </div>
        </div>

        <div class="panel" style="margin-top: 20px;">
          <div class="panel__body" style="padding: 0;">
            <ul id="todoList" style="list-style: none; padding: 0; margin: 0;">
              <!-- Todo items come here -->
              <li style="padding: 20px; text-align: center; color: var(--text-muted);">Laden...</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  `;
  },
  init: async () => {
    // Initial target is the currently logged in user
    targetUserId = window.currentUser?.uid;
    
    if (!targetUserId) {
      console.warn("No user ID found, cannot load todos.");
      return;
    }

    // Hook up superuser dropdown
    const userSelect = document.getElementById("todo-user-select");
    if (userSelect) {
      userSelect.addEventListener("change", (e) => {
        targetUserId = e.target.value;
        subscribeToFirebase(); // Re-subscribe to the new user's list
      });
    }

    // Hook up add buttons
    document.getElementById("addTodoBtn")?.addEventListener("click", addTodo);
    document.getElementById("newTodoInput")?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") addTodo();
    });

    // Initial fetch and subscription
    subscribeToFirebase();
  }
};

function subscribeToFirebase() {
  if (!targetUserId) return;
  
  // Unsubscribe from previous user's list if we had one
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
  }

  const listEl = document.getElementById("todoList");
  if (listEl) {
    listEl.innerHTML = `<li style="padding: 20px; text-align: center; color: var(--text-muted);">Synchroniseren...</li>`;
  }

  // Set up realtime listener. Offline persistence is active, so this works offline too!
  const docRef = doc(db, 'todos', targetUserId);
  unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      currentTodos = docSnap.data().items || [];
    } else {
      currentTodos = [];
    }
    renderTodos();
  }, (error) => {
    console.error("Fout bij ophalen van to-do lijst:", error);
    if (listEl) {
      listEl.innerHTML = `<li style="padding: 20px; text-align: center; color: #ef4444;">Fout bij laden van data.</li>`;
    }
  });
}

async function saveTodosToFirebase() {
  if (!targetUserId) return;
  
  try {
    const docRef = doc(db, 'todos', targetUserId);
    // Setting merge:true ensures we don't accidentally overwrite other fields if added later
    await setDoc(docRef, { items: currentTodos }, { merge: true });
  } catch (error) {
    console.error("Kon to-do lijst niet opslaan:", error);
    alert("Kon taak niet opslaan. Controleer je internetverbinding en probeer het opnieuw.");
  }
}

function addTodo() {
  const input = document.getElementById("newTodoInput");
  const prio = document.getElementById("newTodoPriority");
  if (!input || !prio || !input.value.trim()) return;

  currentTodos.push({
    id: Date.now().toString() + Math.floor(Math.random() * 1000), // Ensure uniqueness
    text: input.value.trim(),
    priority: prio.value,
    completed: false,
    date: new Date().toISOString()
  });

  input.value = "";
  
  // Firebase will trigger onSnapshot when local write happens, updating UI instantly
  saveTodosToFirebase();
}

// Make functions available globally so they can be called from inline event handlers
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

function renderTodos() {
  const list = document.getElementById("todoList");
  if (!list) return;

  list.innerHTML = "";

  if (currentTodos.length === 0) {
    list.innerHTML = `<li style="padding: 20px; text-align: center; color: var(--text-muted);">Je hebt nog geen openstaande taken.</li>`;
    return;
  }

  // Sort: open first, then by priority (high > medium > low), then by date
  const prioWeight = { high: 3, medium: 2, low: 1 };
  
  // Create a copy to sort
  const sortedTodos = [...currentTodos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (prioWeight[a.priority] !== prioWeight[b.priority]) return prioWeight[b.priority] - prioWeight[a.priority];
    return new Date(b.date) - new Date(a.date);
  });

  sortedTodos.forEach(t => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.padding = "16px";
    li.style.borderBottom = "1px solid var(--border)";
    li.style.gap = "12px";
    
    if (t.completed) {
      li.style.opacity = "0.5";
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = t.completed;
    checkbox.style.cursor = "pointer";
    checkbox.style.width = "18px";
    checkbox.style.height = "18px";
    checkbox.style.accentColor = "var(--accent)";
    // Use the global function
    checkbox.addEventListener("change", () => window.toggleTodoItem(t.id));

    const textWrap = document.createElement("div");
    textWrap.style.flex = "1";
    
    const text = document.createElement("span");
    text.textContent = t.text;
    text.style.color = "var(--text)";
    text.style.fontWeight = "500";
    if (t.completed) text.style.textDecoration = "line-through";
    
    let prioColor = "var(--text-muted)";
    let prioText = "Laag";
    if (t.priority === "high") { prioColor = "#ef4444"; prioText = "Hoog"; }
    else if (t.priority === "medium") { prioColor = "#f59e0b"; prioText = "Normaal"; }

    const meta = document.createElement("div");
    meta.innerHTML = `<span style="color: ${prioColor}; font-size: 11px; font-weight: 700; text-transform: uppercase;">${prioText}</span> <span style="color: var(--text-muted); font-size: 11px; margin-left: 8px;">${new Date(t.date).toLocaleDateString('nl-NL')}</span>`;

    textWrap.appendChild(text);
    textWrap.appendChild(meta);

    const delBtn = document.createElement("button");
    delBtn.innerHTML = `<i class="fa-solid fa-trash"></i>`;
    delBtn.style.background = "transparent";
    delBtn.style.border = "none";
    delBtn.style.color = "#ef4444";
    delBtn.style.cursor = "pointer";
    delBtn.style.padding = "8px";
    delBtn.style.opacity = "0.6";
    delBtn.addEventListener("mouseenter", () => delBtn.style.opacity = "1");
    delBtn.addEventListener("mouseleave", () => delBtn.style.opacity = "0.6");
    delBtn.addEventListener("click", () => window.deleteTodoItem(t.id));

    li.appendChild(checkbox);
    li.appendChild(textWrap);
    li.appendChild(delBtn);

    list.appendChild(li);
  });
}
