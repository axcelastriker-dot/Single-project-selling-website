// ── Viewer page logic ─────────────────────────────────────────────
import { PROJECT_TREE, FILE_CONTENTS } from './project-data.js';
import { supabase } from './supabaseClient.js';

// ── Session & Subscription guard ───────────────────────────────────
(async function guardSession() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    window.location.href = '/';
    return;
  }

  // Check database for active subscription
  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('plan_id, expires_at')
    .eq('user_id', session.user.id)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1);

  if (error || !subs || subs.length === 0) {
    window.location.href = '/';
    return;
  }

  // Set plan label in UI
  const plan = subs[0].plan_id;
  const expiryDate = new Date(subs[0].expires_at);
  const planLabel = document.getElementById('plan-label');
  if (planLabel) planLabel.textContent = plan === 'yearly' ? 'Yearly' : 'Monthly';

  // Check for expiry warning (7 days before)
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  console.log('Subscription Expiry Debug:', {
    expiryDate: expiryDate.toISOString(),
    now: now.toISOString(),
    diffDays: diffDays
  });

  if (diffDays <= 7 && diffDays >= 0) {
    showExpiryWarning(diffDays);
  }
})();

function showExpiryWarning(days) {
  // Ensure DOM is ready for insertion
  const tryInsert = () => {
    const viewerMain = document.querySelector('.viewer-main');
    if (!viewerMain) {
      setTimeout(tryInsert, 100);
      return;
    }
    
    const banner = document.createElement('div');
    banner.className = 'expiry-banner';
    const daysText = days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`;
    
    banner.innerHTML = `
      <div class="expiry-content">
        <span class="expiry-icon">⚠️</span>
        <p>Your subscription expires <strong>${daysText}</strong>. Renew now to keep access!</p>
        <a href="/#pricing" class="expiry-renew-btn">Renew Now</a>
      </div>
    `;
    viewerMain.prepend(banner);
    console.log('Expiry banner injected successfully');
  };

  tryInsert();
}


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
window.endSession = async function () {
  if (confirm('End your session and return to the home page?')) {
    await supabase.auth.signOut();
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

  /* Expiry Banner Styles */
  .expiry-banner {
    background: linear-gradient(90deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);
    border-bottom: 1px solid rgba(245, 158, 11, 0.2);
    padding: 0.75rem 1.5rem;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }
  .expiry-content {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.85rem;
    color: #fde68a;
  }
  .expiry-renew-btn {
    background: #f59e0b;
    color: #000;
    text-decoration: none;
    padding: 0.35rem 0.75rem;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.75rem;
    transition: all 0.2s ease;
  }
  .expiry-renew-btn:hover {
    background: #fbbf24;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  }
`;
document.head.appendChild(style);
