// ── Viewer page logic ─────────────────────────────────────────────
import { PROJECT_TREE, FILE_CONTENTS } from './project-data.js';

// ── Session guard ─────────────────────────────────────────────────
(function guardSession() {
  const subscribed = sessionStorage.getItem('cv_subscribed');
  const expires    = parseInt(sessionStorage.getItem('cv_expires') || '0');
  if (!subscribed || Date.now() > expires) {
    sessionStorage.removeItem('cv_subscribed');
    window.location.href = '/';
  }
})();

// ── Plan label ────────────────────────────────────────────────────
const plan = sessionStorage.getItem('cv_plan') || 'monthly';
const planLabel = document.getElementById('plan-label');
if (planLabel) planLabel.textContent = plan === 'yearly' ? 'Yearly' : 'Monthly';

// ── State ─────────────────────────────────────────────────────────
let openTabs     = [];   // [{ path, name, lang }]
let activeTab    = null;

// ── DOM refs ──────────────────────────────────────────────────────
const treeRoot      = document.getElementById('tree-root');
const codeArea      = document.getElementById('code-area');
const tabBar        = document.getElementById('tab-bar');
const breadcrumbEl  = document.getElementById('viewer-breadcrumb');

// ── Disable keyboard copy shortcuts on code area ──────────────────
codeArea.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && ['c','a','s','u'].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});

// ── File icon helper ──────────────────────────────────────────────
function fileIcon(name) {
  if (name.endsWith('.js'))   return '📜';
  if (name.endsWith('.json')) return '🔧';
  if (name.endsWith('.md'))   return '📘';
  if (name.endsWith('.env.example') || name.startsWith('.env')) return '🔑';
  if (name.endsWith('.css'))  return '🎨';
  if (name.endsWith('.html')) return '🌐';
  return '📄';
}

// ── Build file tree ───────────────────────────────────────────────
function buildTree(nodes, parentPath = '') {
  const ul = document.createElement('ul');
  ul.style.listStyle = 'none';
  ul.style.padding = '0';

  nodes.forEach(node => {
    const li  = document.createElement('li');
    const path = parentPath ? `${parentPath}/${node.name}` : node.name;

    if (node.type === 'folder') {
      const isOpen = node.open !== false;
      const header = document.createElement('div');
      header.className = 'vtree-item folder';
      header.innerHTML = `<span>${isOpen ? '📂' : '📁'}</span><span>${node.name}</span>`;

      const children = document.createElement('div');
      children.className = `vtree-children ${isOpen ? 'open' : ''}`;
      if (node.children) children.appendChild(buildTree(node.children, path));

      header.addEventListener('click', () => {
        const open = children.classList.toggle('open');
        header.querySelector('span:first-child').textContent = open ? '📂' : '📁';
      });

      li.appendChild(header);
      li.appendChild(children);
    } else {
      const item = document.createElement('div');
      item.className = 'vtree-item';
      item.setAttribute('data-path', path);
      item.innerHTML = `<span>${fileIcon(node.name)}</span><span>${node.name}</span>`;
      item.addEventListener('click', () => openFile(path, node.name, node.lang));
      li.appendChild(item);
    }

    ul.appendChild(li);
  });

  return ul;
}

treeRoot.appendChild(buildTree(PROJECT_TREE));

// ── Tab management ────────────────────────────────────────────────
function renderTabs() {
  tabBar.innerHTML = '';
  openTabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = `code-tab ${tab.path === activeTab ? 'active' : ''}`;
    el.innerHTML = `<span>${fileIcon(tab.name)} ${tab.name}</span><span class="tab-close" data-path="${tab.path}">✕</span>`;
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-close')) {
        closeTab(tab.path);
      } else {
        switchTab(tab.path);
      }
    });
    tabBar.appendChild(el);
  });
}

function switchTab(path) {
  activeTab = path;
  renderTabs();
  displayCode(path);
}

function closeTab(path) {
  openTabs = openTabs.filter(t => t.path !== path);
  if (activeTab === path) {
    activeTab = openTabs.length ? openTabs[openTabs.length - 1].path : null;
  }
  renderTabs();
  if (activeTab) displayCode(activeTab);
  else showWelcome();
}

// ── Open a file ───────────────────────────────────────────────────
function openFile(path, name, lang) {
  // Update active tree item
  document.querySelectorAll('.vtree-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-path="${path}"]`)?.classList.add('active');

  // Add tab if not already open
  if (!openTabs.find(t => t.path === path)) {
    openTabs.push({ path, name, lang });
  }
  switchTab(path);
}

// ── Display code in viewer ────────────────────────────────────────
function displayCode(path) {
  const content = FILE_CONTENTS[path];
  const tab     = openTabs.find(t => t.path === path);
  if (!tab) return;

  breadcrumbEl.textContent = `— ${path}`;

  if (content === undefined) {
    codeArea.innerHTML = `<div class="welcome-msg"><div class="icon">⚠️</div><p>File content not available.</p></div>`;
    return;
  }

  // Escape HTML then highlight
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  let highlighted = escaped;
  try {
    highlighted = hljs.highlight(escaped, { language: tab.lang, ignoreIllegals: true }).value;
  } catch {}

  // Build lines
  const lines = highlighted.split('\n');
  const linesHtml = lines.map((line, i) =>
    `<div class="code-line"><span class="ln">${i + 1}</span><span>${line || ' '}</span></div>`
  ).join('');

  codeArea.innerHTML = `<pre><code class="with-lines">${linesHtml}</code></pre>`;
}

// ── Welcome screen ────────────────────────────────────────────────
function showWelcome() {
  breadcrumbEl.textContent = '— Select a file';
  codeArea.innerHTML = `
    <div class="welcome-msg">
      <div class="icon">📂</div>
      <p>Select a file from the explorer to view its code.</p>
    </div>`;
}

// ── End session ───────────────────────────────────────────────────
window.endSession = function () {
  if (confirm('End your session and return to the home page?')) {
    sessionStorage.removeItem('cv_subscribed');
    sessionStorage.removeItem('cv_plan');
    sessionStorage.removeItem('cv_expires');
    sessionStorage.removeItem('cv_payment_id');
    window.location.href = '/';
  }
};

// ── Line number style patch ───────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
  .code-line { display: flex; min-height: 1.8em; }
  .code-line .ln {
    min-width: 3rem; color: var(--text-muted); text-align: right;
    padding-right: 1.5rem; user-select: none; flex-shrink: 0;
    font-family: 'JetBrains Mono', monospace;
  }
  .code-line span:last-child { flex: 1; }
`;
document.head.appendChild(style);
