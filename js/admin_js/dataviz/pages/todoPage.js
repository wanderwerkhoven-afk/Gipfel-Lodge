export const TodoPage = {
  id: "todo",
  title: "TO-DO's",
  template: () => `
    <div class="container slide-up">
      <div class="page-head">
        <div>
          <h2 class="page-title">Actiepunten</h2>
          <p class="page-subtitle">Beheer je taken en to-do's</p>
        </div>
      </div>

      <section class="content-section" style="max-width: 600px; margin: 0 auto;">
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
            </ul>
          </div>
        </div>
      </section>
    </div>
  `,
  init: async () => {
    loadTodos();
    document.getElementById("addTodoBtn")?.addEventListener("click", addTodo);
    document.getElementById("newTodoInput")?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") addTodo();
    });
  }
};

const STORAGE_KEY = "gipfel_admin_todos";

function getTodos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function addTodo() {
  const input = document.getElementById("newTodoInput");
  const prio = document.getElementById("newTodoPriority");
  if (!input || !prio || !input.value.trim()) return;

  const todos = getTodos();
  todos.push({
    id: Date.now().toString(),
    text: input.value.trim(),
    priority: prio.value,
    completed: false,
    date: new Date().toISOString()
  });

  saveTodos(todos);
  input.value = "";
  loadTodos();
}

function toggleTodo(id) {
  const todos = getTodos();
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodos(todos);
    loadTodos();
  }
}

function deleteTodo(id) {
  const todos = getTodos();
  const newTodos = todos.filter(t => t.id !== id);
  saveTodos(newTodos);
  loadTodos();
}

function loadTodos() {
  const list = document.getElementById("todoList");
  if (!list) return;

  const todos = getTodos();
  list.innerHTML = "";

  if (todos.length === 0) {
    list.innerHTML = `<li style="padding: 20px; text-align: center; color: var(--text-muted);">Je hebt nog geen openstaande taken.</li>`;
    return;
  }

  // Sort: open first, then by priority (high > medium > low), then by date
  const prioWeight = { high: 3, medium: 2, low: 1 };
  
  todos.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (prioWeight[a.priority] !== prioWeight[b.priority]) return prioWeight[b.priority] - prioWeight[a.priority];
    return new Date(b.date) - new Date(a.date);
  });

  todos.forEach(t => {
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
    checkbox.addEventListener("change", () => toggleTodo(t.id));

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
    delBtn.addEventListener("click", () => deleteTodo(t.id));

    li.appendChild(checkbox);
    li.appendChild(textWrap);
    li.appendChild(delBtn);

    list.appendChild(li);
  });
}
