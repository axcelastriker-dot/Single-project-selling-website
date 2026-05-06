// ── PROJECT DATA ─────────────────────────────────────────────────
// Replace the content below with your own project files.
// ─────────────────────────────────────────────────────────────────

// ── STEP 1: Folder / File Tree ────────────────────────────────────
export const PROJECT_TREE = [
  {
    name: 'todo-app', type: 'folder', open: true,
    children: [
      { name: 'index.html', type: 'file', lang: 'html' },
      { name: 'style.css',  type: 'file', lang: 'css'  },
      { name: 'script.js',  type: 'file', lang: 'javascript' },
      { name: 'README.md',  type: 'file', lang: 'markdown' },
    ],
  },
];

// ── STEP 2: File Contents ─────────────────────────────────────────
export const FILE_CONTENTS = {

  'todo-app/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Todo App</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="container">
    <h1>My Todo List</h1>

    <div class="input-row">
      <input type="text" id="todo-input" placeholder="Add a new task..." />
      <button id="add-btn">Add</button>
    </div>

    <ul id="todo-list"></ul>
  </div>

  <script src="script.js"></script>
</body>
</html>`,

  'todo-app/style.css': `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', sans-serif;
  background: #f4f6fb;
  display: flex;
  justify-content: center;
  padding: 3rem 1rem;
}

.container {
  background: #fff;
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
}

h1 {
  font-size: 1.6rem;
  margin-bottom: 1.5rem;
  color: #1a1a2e;
}

.input-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

input {
  flex: 1;
  padding: 0.65rem 1rem;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
  transition: border 0.2s;
}

input:focus { border-color: #6366f1; }

button {
  padding: 0.65rem 1.25rem;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover { background: #4f46e5; }

ul { list-style: none; }

li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 0.95rem;
  color: #333;
}

li.done span { text-decoration: line-through; color: #aaa; }

li button {
  background: none;
  color: #ef4444;
  font-size: 1.1rem;
  padding: 0;
  width: 28px;
  height: 28px;
  border-radius: 6px;
}

li button:hover { background: #fee2e2; }`,

  'todo-app/script.js': `const input   = document.getElementById('todo-input');
const addBtn  = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');

// Load saved todos from localStorage
let todos = JSON.parse(localStorage.getItem('todos') || '[]');

function saveTodos() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

function renderTodos() {
  todoList.innerHTML = '';

  todos.forEach((todo, index) => {
    const li = document.createElement('li');
    li.className = todo.done ? 'done' : '';

    const span = document.createElement('span');
    span.textContent = todo.text;
    span.style.cursor = 'pointer';
    span.onclick = () => toggleDone(index);

    const del = document.createElement('button');
    del.textContent = '✕';
    del.onclick = () => deleteTodo(index);

    li.appendChild(span);
    li.appendChild(del);
    todoList.appendChild(li);
  });
}

function addTodo() {
  const text = input.value.trim();
  if (!text) return;
  todos.push({ text, done: false });
  saveTodos();
  renderTodos();
  input.value = '';
}

function toggleDone(index) {
  todos[index].done = !todos[index].done;
  saveTodos();
  renderTodos();
}

function deleteTodo(index) {
  todos.splice(index, 1);
  saveTodos();
  renderTodos();
}

addBtn.addEventListener('click', addTodo);
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTodo();
});

// Initial render
renderTodos();`,

  'todo-app/README.md': `# Todo App

A simple, localStorage-powered Todo List app.

## Features
- Add tasks by typing and pressing Enter or clicking Add
- Click a task to mark it done (strikethrough)
- Delete tasks with the ✕ button
- Tasks are saved to localStorage (persist on refresh)

## Files
- \`index.html\` — Page structure
- \`style.css\`  — Styling
- \`script.js\`  — All logic (add, toggle, delete, save)

## How to Run
Just open \`index.html\` in any browser. No build step needed.`,

};


// ══════════════════════════════════════════════════════════════════
// 📋 COPY-PASTE TEMPLATE — Replace the sample above with this
// ══════════════════════════════════════════════════════════════════
//
// export const PROJECT_TREE = [
//   {
//     name: 'YOUR-PROJECT-NAME', type: 'folder', open: true,
//     children: [
//
//       // ── Single file at root level:
//       { name: 'index.html', type: 'file', lang: 'html' },
//       { name: 'style.css',  type: 'file', lang: 'css' },
//       { name: 'script.js',  type: 'file', lang: 'javascript' },
//
//       // ── Sub-folder with files inside:
//       {
//         name: 'src', type: 'folder',
//         children: [
//           { name: 'app.js',  type: 'file', lang: 'javascript' },
//           { name: 'api.js',  type: 'file', lang: 'javascript' },
//         ],
//       },
//
//       // ── Another sub-folder:
//       {
//         name: 'components', type: 'folder',
//         children: [
//           { name: 'Header.js', type: 'file', lang: 'javascript' },
//           { name: 'Footer.js', type: 'file', lang: 'javascript' },
//         ],
//       },
//
//       { name: 'package.json', type: 'file', lang: 'json' },
//       { name: 'README.md',    type: 'file', lang: 'markdown' },
//     ],
//   },
// ];
//
// export const FILE_CONTENTS = {
//
//   'YOUR-PROJECT-NAME/index.html': `paste your index.html code here`,
//
//   'YOUR-PROJECT-NAME/style.css': `paste your style.css code here`,
//
//   'YOUR-PROJECT-NAME/script.js': `paste your script.js code here`,
//
//   'YOUR-PROJECT-NAME/src/app.js': `paste your app.js code here`,
//
//   'YOUR-PROJECT-NAME/src/api.js': `paste your api.js code here`,
//
//   'YOUR-PROJECT-NAME/components/Header.js': `paste code here`,
//
//   'YOUR-PROJECT-NAME/components/Footer.js': `paste code here`,
//
//   'YOUR-PROJECT-NAME/package.json': `paste your package.json here`,
//
//   'YOUR-PROJECT-NAME/README.md': `paste your README here`,
//
// };
//
// ⚠️  RULES:
//  1. The path key must match exactly:  'projectname/folder/file.ext'
//  2. Use backtick strings ` ` for file contents
//  3. If your code contains a backtick, escape it as \`
//  4. lang values: html | css | javascript | typescript |
//                  json | markdown | python | sql | bash
// ══════════════════════════════════════════════════════════════════
