/* ─── Color Presets ────────────────────────────────────────── */
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
let db, auth;
let dashboardReady = false;
let selectedColor  = COLOR_PRESETS[6]; // default teal

/* ─── Firebase Init ────────────────────────────────────────── */
function initFirebase() {
  try {
    const app = firebase.apps.length
      ? firebase.app()
      : firebase.initializeApp(firebaseConfig);
    db   = firebase.database(app);
    auth = firebase.auth(app);
    return true;
  } catch (e) {
    console.error('Firebase init failed', e);
    return false;
  }
}

/* ─── Auth Flow ────────────────────────────────────────────── */
function watchAuthState() {
  auth.onAuthStateChanged(async user => {
    if (!user) {
      showLoginScreen();
      return;
    }
    try {
      const snap = await db.ref(`admins/${user.uid}`).once('value');
      if (snap.val() === true) {
        showDashboard();
      } else {
        await auth.signOut();
        showLoginScreen('Your account is not authorised as admin.');
      }
    } catch {
      await auth.signOut();
      showLoginScreen('Could not verify admin access. Try again.');
    }
  });
}

async function doLogin(email, password) {
  const FRIENDLY = {
    'auth/invalid-credential':  'Incorrect email or password.',
    'auth/user-not-found':      'No account found with this email.',
    'auth/wrong-password':      'Incorrect password.',
    'auth/too-many-requests':   'Too many attempts. Try again later.',
    'auth/invalid-email':       'Invalid email address.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (e) {
    throw new Error(FRIENDLY[e.code] || e.message);
  }
}

async function doLogout() {
  await auth.signOut();
  dashboardReady = false;
}

function showLoginScreen(err = '') {
  document.getElementById('login-screen').hidden = false;
  document.getElementById('dashboard').hidden     = true;
  if (err) document.getElementById('login-error').textContent = err;
}

function showDashboard() {
  document.getElementById('login-screen').hidden = true;
  document.getElementById('dashboard').hidden     = false;
  if (!dashboardReady) {
    dashboardReady = true;
    initDashboard();
  }
}

/* ─── Toast ────────────────────────────────────────────────── */
function showToast(msg, type = '') {
  const c  = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className  = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ─── Utilities ────────────────────────────────────────────── */
function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c =>
    c.hidden = c.dataset.tab !== tab);
}

/* ─── Deletion Requests ────────────────────────────────────── */
function listenDeletions() {
  db.ref('pending_deletions').on('value', snap => {
    const data = snap.val() || {};
    const list = Object.entries(data)
      .map(([id, r]) => ({ id, ...r }))
      .sort((a, b) => b.requestedAt - a.requestedAt);

    const badge = document.getElementById('del-badge');
    badge.textContent  = list.length;
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
        <button class="btn-approve" data-request-id="${r.id}" data-contact-id="${r.contactId}">
          🗑 Approve & Delete
        </button>
        <button class="btn-reject" data-request-id="${r.id}">
          ✕ Reject
        </button>
      </div>
    </div>`).join('');

  el.querySelectorAll('.btn-approve').forEach(btn =>
    btn.addEventListener('click', () => approveDeletion(btn.dataset.requestId, btn.dataset.contactId)));
  el.querySelectorAll('.btn-reject').forEach(btn =>
    btn.addEventListener('click', () => rejectDeletion(btn.dataset.requestId)));
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
  } catch (e) {
    console.error(e);
    showToast('Delete failed — check console.', 'error');
  }
}

async function rejectDeletion(requestId) {
  try {
    await db.ref(`pending_deletions/${requestId}`).remove();
    showToast('Request rejected.', '');
  } catch {
    showToast('Failed to reject. Try again.', 'error');
  }
}

/* ─── Categories ───────────────────────────────────────────── */
function buildColorSwatches() {
  const wrap = document.getElementById('color-swatches');
  wrap.innerHTML = COLOR_PRESETS.map((p, i) => `
    <div class="color-swatch ${i === 6 ? 'selected' : ''}"
         style="background:${p.color}"
         data-index="${i}"
         title="${p.color}"></div>`).join('');

  wrap.querySelectorAll('.color-swatch').forEach(swatch =>
    swatch.addEventListener('click', () => selectColor(+swatch.dataset.index)));
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
  prev.textContent    = `${emoji} ${name}`;
  prev.style.background = selectedColor.bg;
  prev.style.color      = selectedColor.color;
}

function listenCategories() {
  db.ref('categories').on('value', snap => {
    const data = snap.val() || {};
    const list = Object.entries(data)
      .map(([id, c]) => ({ id, ...c }))
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
      <button class="btn-delete-cat" data-cat-id="${c.id}" title="Delete">🗑</button>
    </div>`).join('');

  el.querySelectorAll('.btn-delete-cat').forEach(btn =>
    btn.addEventListener('click', () => deleteCategory(btn.dataset.catId)));
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
      emoji,
      color:     selectedColor.color,
      bg:        selectedColor.bg,
      createdAt: Date.now(),
    });
    document.getElementById('cat-emoji').value = '';
    document.getElementById('cat-name').value  = '';
    updateCatPreview();
    showToast(`"${name}" added!`, 'success');
  } catch {
    showToast('Failed to add category.', 'error');
  } finally {
    btn.disabled = false;
  }
}

async function deleteCategory(id) {
  if (!confirm('Delete this custom category? Existing contacts will show as "Other".')) return;
  try {
    await db.ref(`categories/${id}`).remove();
    showToast('Category deleted.', '');
  } catch {
    showToast('Failed to delete category.', 'error');
  }
}

/* ─── Dashboard Init ───────────────────────────────────────── */
function initDashboard() {
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  document.getElementById('btn-logout').addEventListener('click', doLogout);

  buildColorSwatches();
  updateCatPreview();
  document.getElementById('cat-emoji').addEventListener('input', updateCatPreview);
  document.getElementById('cat-name').addEventListener('input', updateCatPreview);
  document.getElementById('btn-add-cat').addEventListener('click', addCategory);

  listenDeletions();
  listenCategories();
}

/* ─── Bootstrap ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (!initFirebase()) {
    document.getElementById('login-error').textContent = 'Firebase not configured.';
    return;
  }

  // Login form
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const pwd   = document.getElementById('admin-pwd').value;
    const btn   = e.target.querySelector('.login-btn');
    const errEl = document.getElementById('login-error');

    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Signing in…';

    try {
      await doLogin(email, pwd);
      // onAuthStateChanged handles the rest
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Login →';
    }
  });

  // Clear error on input
  ['admin-email','admin-pwd'].forEach(id =>
    document.getElementById(id).addEventListener('input', () => {
      document.getElementById('login-error').textContent = '';
    })
  );

  // Firebase Auth manages session persistence automatically
  watchAuthState();
});
