/* ─── Admin Config ─────────────────────────────────────────── */
// Change this password before deploying!
const ADMIN_PASSWORD = 'admin@2025';

const COLOR_PRESETS = [
  { color: '#ef4444', bg: '#fee2e2' },
  { color: '#f97316', bg: '#ffedd5' },
  { color: '#f59e0b', bg: '#fef3c7' },
  { color: '#84cc16', bg: '#f7fee7' },
  { color: '#22c55e', bg: '#dcfce7' },
  { color: '#14b8a6', bg: '#ccfbf1' },
  { color: '#0d9488', bg: '#f0fdfa' },
  { color: '#3b82f6', bg: '#dbeafe' },
  { color: '#8b5cf6', bg: '#ede9fe' },
  { color: '#ec4899', bg: '#fce7f3' },
  { color: '#6b7280', bg: '#f3f4f6' },
  { color: '#92400e', bg: '#fde68a' },
];

/* ─── State ────────────────────────────────────────────────── */
let db;
let currentTab = 'deletions';
let selectedColor = COLOR_PRESETS[5]; // default teal

/* ─── Auth ─────────────────────────────────────────────────── */
function isAuthed() { return sessionStorage.getItem('sd_admin') === 'true'; }

function login(pwd) {
  if (pwd === ADMIN_PASSWORD) {
    sessionStorage.setItem('sd_admin', 'true');
    return true;
  }
  return false;
}

function logout() {
  sessionStorage.removeItem('sd_admin');
  document.getElementById('dashboard').hidden = true;
  document.getElementById('login-screen').hidden = false;
  document.getElementById('admin-pwd').value = '';
}

/* ─── Toast ────────────────────────────────────────────────── */
function showToast(msg, type = '') {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* ─── Escape HTML ──────────────────────────────────────────── */
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function timeAgo(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60)    return 'Just now';
  if (d < 3600)  return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

/* ─── Tabs ─────────────────────────────────────────────────── */
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c =>
    c.hidden = c.dataset.tab !== tab);
}

/* ─── Deletion Requests ────────────────────────────────────── */
function listenDeletions() {
  db.ref('pending_deletions').on('value', snap => {
    const data = snap.val() || {};
    const list = Object.entries(data).map(([id, r]) => ({ id, ...r }))
      .sort((a, b) => b.requestedAt - a.requestedAt);

    const badge = document.getElementById('del-badge');
    badge.textContent = list.length;
    badge.style.display = list.length ? 'inline' : 'none';

    renderDeletions(list);
  });
}

function renderDeletions(list) {
  const el = document.getElementById('deletions-list');
  if (list.length === 0) {
    el.innerHTML = `
      <div class="admin-empty">
        <span class="icon">✅</span>
        <h3>No pending requests</h3>
        <p>All deletion requests have been handled.</p>
      </div>`;
    return;
  }

  el.innerHTML = list.map(r => `
    <div class="deletion-card">
      <div class="deletion-card-top">
        <div class="del-avatar">🗑</div>
        <div class="del-info">
          <div class="del-name">${esc(r.contactName)}</div>
          <div class="del-meta">
            <span>📞 ${esc(r.contactPhone)}</span>
            <span>🏷 ${esc(r.contactCategory || 'other')}</span>
            <span>🕐 ${timeAgo(r.requestedAt)}</span>
          </div>
        </div>
      </div>
      ${r.reason ? `<div class="del-reason">💬 "${esc(r.reason)}"</div>` : ''}
      <div class="del-actions">
        <button class="btn-approve" onclick="approveDeletion('${r.id}','${r.contactId}')">
          🗑 Approve & Delete
        </button>
        <button class="btn-reject" onclick="rejectDeletion('${r.id}')">
          ✕ Reject
        </button>
      </div>
    </div>`).join('');
}

async function approveDeletion(requestId, contactId) {
  if (!confirm('Permanently delete this contact? This cannot be undone.')) return;
  try {
    await Promise.all([
      db.ref(`contacts/approved/${contactId}`).remove(),
      db.ref(`pending_deletions/${requestId}`).remove(),
      db.ref(`ratings/${contactId}`).remove(),
      db.ref(`reviews/${contactId}`).remove(),
    ]);
    showToast('Contact deleted successfully.', 'success');
  } catch {
    showToast('Failed to delete. Try again.', 'error');
  }
}

async function rejectDeletion(requestId) {
  try {
    await db.ref(`pending_deletions/${requestId}`).remove();
    showToast('Deletion request rejected.', '');
  } catch {
    showToast('Failed to reject. Try again.', 'error');
  }
}

/* ─── Categories ───────────────────────────────────────────── */
function buildColorSwatches() {
  const wrap = document.getElementById('color-swatches');
  wrap.innerHTML = COLOR_PRESETS.map((p, i) => `
    <div class="color-swatch ${i === 5 ? 'selected' : ''}"
         style="background:${p.color}"
         data-index="${i}"
         title="${p.color}"
         onclick="selectColor(${i})"></div>`).join('');
}

function selectColor(index) {
  selectedColor = COLOR_PRESETS[index];
  document.querySelectorAll('.color-swatch').forEach((s, i) =>
    s.classList.toggle('selected', i === index));
  updateCatPreview();
}

function updateCatPreview() {
  const emoji = document.getElementById('cat-emoji').value.trim() || '⭐';
  const name  = document.getElementById('cat-name').value.trim()  || 'Category';
  const prev  = document.getElementById('cat-preview');
  prev.textContent = `${emoji} ${name}`;
  prev.style.background = selectedColor.bg;
  prev.style.color       = selectedColor.color;
}

function listenCategories() {
  db.ref('categories').on('value', snap => {
    const data = snap.val() || {};
    const list = Object.entries(data).map(([id, c]) => ({ id, ...c }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    renderCustomCategories(list);
  });
}

function renderCustomCategories(list) {
  const el = document.getElementById('custom-cats-list');
  if (list.length === 0) {
    el.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:16px 0">No custom categories yet.</p>`;
    return;
  }
  el.innerHTML = list.map(c => `
    <div class="custom-cat-item">
      <div class="custom-cat-emoji">${esc(c.emoji)}</div>
      <div class="custom-cat-info">
        <div class="custom-cat-name">${esc(c.label)}</div>
        <div class="custom-cat-badge" style="background:${c.bg};color:${c.color}">${esc(c.label)}</div>
      </div>
      <button class="btn-delete-cat" onclick="deleteCategory('${c.id}')" title="Delete category">🗑</button>
    </div>`).join('');
}

async function addCategory() {
  const emoji = document.getElementById('cat-emoji').value.trim();
  const name  = document.getElementById('cat-name').value.trim();
  if (!emoji) { showToast('Please enter an emoji.', 'error'); return; }
  if (!name)  { showToast('Please enter a category name.', 'error'); return; }

  const btn = document.getElementById('btn-add-cat');
  btn.disabled = true;
  try {
    const newRef = db.ref('categories').push();
    await newRef.set({
      id:        newRef.key,
      label:     name,
      emoji:     emoji,
      color:     selectedColor.color,
      bg:        selectedColor.bg,
      createdAt: Date.now(),
    });
    document.getElementById('cat-emoji').value = '';
    document.getElementById('cat-name').value  = '';
    updateCatPreview();
    showToast(`"${name}" category added!`, 'success');
  } catch {
    showToast('Failed to add category. Try again.', 'error');
  } finally {
    btn.disabled = false;
  }
}

async function deleteCategory(id) {
  if (!confirm('Delete this custom category? Existing contacts with this category will show as "Other".')) return;
  try {
    await db.ref(`categories/${id}`).remove();
    showToast('Category deleted.', '');
  } catch {
    showToast('Failed to delete category.', 'error');
  }
}

/* ─── Bootstrap ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Login form
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const pwd = document.getElementById('admin-pwd').value;
    if (login(pwd)) {
      document.getElementById('login-screen').hidden = true;
      document.getElementById('dashboard').hidden = false;
      initDashboard();
    } else {
      document.getElementById('login-error').textContent = 'Incorrect password.';
      document.getElementById('admin-pwd').value = '';
    }
  });

  document.getElementById('admin-pwd').addEventListener('input', () => {
    document.getElementById('login-error').textContent = '';
  });

  // Auto-login if session active
  if (isAuthed()) {
    document.getElementById('login-screen').hidden = true;
    document.getElementById('dashboard').hidden = false;
    initDashboard();
  }
});

function initDashboard() {
  // Firebase init (reuse config from firebase-config.js)
  if (!db) {
    try {
      const app = firebase.apps.length
        ? firebase.app()
        : firebase.initializeApp(firebaseConfig);
      db = firebase.database(app);
    } catch (e) {
      showToast('Firebase init failed.', 'error');
      return;
    }
  }

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', logout);

  // Category form
  buildColorSwatches();
  updateCatPreview();
  document.getElementById('cat-emoji').addEventListener('input', updateCatPreview);
  document.getElementById('cat-name').addEventListener('input', updateCatPreview);
  document.getElementById('btn-add-cat').addEventListener('click', addCategory);

  // Start real-time listeners
  listenDeletions();
  listenCategories();
}
