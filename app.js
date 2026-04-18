/* ─── Constants ────────────────────────────────────────────── */
const DEFAULT_CATEGORIES = [
  { id: 'all',         label: 'All',         emoji: '🔍', color: '#6366f1', bg: '#e0e7ff' },
  { id: 'plumber',     label: 'Plumber',     emoji: '🔧', color: '#2563eb', bg: '#dbeafe' },
  { id: 'electrician', label: 'Electrician', emoji: '⚡', color: '#d97706', bg: '#fef3c7' },
  { id: 'carpenter',   label: 'Carpenter',   emoji: '🪚', color: '#92400e', bg: '#fde68a' },
  { id: 'tutor',       label: 'Tutor',       emoji: '📚', color: '#7c3aed', bg: '#ede9fe' },
  { id: 'doctor',      label: 'Doctor',      emoji: '🩺', color: '#dc2626', bg: '#fee2e2' },
  { id: 'mechanic',    label: 'Mechanic',    emoji: '🔩', color: '#475569', bg: '#f1f5f9' },
  { id: 'painter',     label: 'Painter',     emoji: '🎨', color: '#db2777', bg: '#fce7f3' },
  { id: 'cleaner',     label: 'Cleaner',     emoji: '🧹', color: '#16a34a', bg: '#dcfce7' },
  { id: 'cook',        label: 'Cook',        emoji: '👨‍🍳', color: '#ea580c', bg: '#ffedd5' },
  { id: 'ac_repair',   label: 'AC Repair',   emoji: '❄️', color: '#0891b2', bg: '#cffafe' },
  { id: 'security',    label: 'Security',    emoji: '🔒', color: '#1d4ed8', bg: '#dbeafe' },
  { id: 'decorator',   label: 'Decorator',          emoji: '🎀', color: '#be185d', bg: '#fce7f3' },
  { id: 'interior',   label: 'Interior Decorator', emoji: '🛋️', color: '#7c3aed', bg: '#ede9fe' },
  { id: 'driver',     label: 'Driver',             emoji: '🚗', color: '#0f766e', bg: '#ccfbf1' },
  { id: 'water',      label: 'Water Supply',        emoji: '💧', color: '#0284c7', bg: '#e0f2fe' },
  { id: 'lpg',        label: 'LPG Supply & Repair', emoji: '🔥', color: '#b45309', bg: '#fef3c7' },
  { id: 'other',      label: 'Other',               emoji: '⭐', color: '#9333ea', bg: '#f3e8ff' },
];

let CATEGORIES = [...DEFAULT_CATEGORIES];
let CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

/* ─── State ────────────────────────────────────────────────── */
const state = {
  contacts:        [],
  filtered:        [],
  activeCategory:  'all',
  searchQuery:     '',
  openContact:     null,
  userRatings:     {},
};

/* ─── Firebase ─────────────────────────────────────────────── */
let db;

function initFirebase() {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    return true;
  } catch (e) {
    console.error('Firebase init failed:', e);
    return false;
  }
}

/* ─── Device UUID ──────────────────────────────────────────── */
function getDeviceId() {
  let id = localStorage.getItem('sd_device_id');
  if (!id) {
    id = crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    localStorage.setItem('sd_device_id', id);
  }
  return id;
}
const DEVICE_ID = getDeviceId();

/* ─── Toast ────────────────────────────────────────────────── */
function showToast(msg, type = '') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* ─── Star Helpers ─────────────────────────────────────────── */
function renderStars(rating, total = 5) {
  let s = '';
  for (let i = 1; i <= total; i++) s += i <= Math.round(rating) ? '★' : '☆';
  return s;
}

/* ─── Render Contact Cards ─────────────────────────────────── */
function renderCards() {
  const grid  = document.getElementById('contacts-grid');
  const empty = document.getElementById('empty-state');
  const count = document.getElementById('contact-count');

  grid.innerHTML = '';

  if (state.filtered.length === 0) {
    empty.hidden = false;
    count.textContent = '0 contacts';
    return;
  }
  empty.hidden = true;
  count.innerHTML = `<b>${state.filtered.length}</b> contact${state.filtered.length !== 1 ? 's' : ''}`;

  state.filtered.forEach((contact, i) => {
    const cat = CATEGORY_MAP[contact.category] || CATEGORY_MAP['other'];
    const avgRating = calcAvgRating(contact.ratings);
    const ratingCount = contact.ratings ? Object.keys(contact.ratings).length : 0;

    const card = document.createElement('div');
    card.className = 'contact-card';
    card.style.animationDelay = `${i * 45}ms`;
    card.dataset.id = contact.id;

    const phone = contact.phone.replace(/\D/g, '');
    const wa    = (contact.whatsapp || contact.phone).replace(/\D/g, '');
    const ratingLabel = avgRating > 0
      ? `${avgRating.toFixed(1)} · ${ratingCount} rating${ratingCount !== 1 ? 's' : ''}`
      : 'No ratings yet';

    card.innerHTML = `
      <div class="card-stripe" style="background:linear-gradient(90deg,${cat.color},${cat.color}88)"></div>
      <div class="card-inner">
        <div class="card-avatar" style="background:${cat.bg}">${escHtml(cat.emoji)}</div>
        <div class="card-body">
          <div class="card-name">${escHtml(contact.name)}</div>
          <div class="card-badge" style="background:${cat.bg};color:${cat.color}">${escHtml(cat.emoji)} ${escHtml(cat.label)}</div>
          <div class="card-phone">📞 ${escHtml(contact.phone)}</div>
          ${contact.description ? `<div class="card-desc">${escHtml(contact.description)}</div>` : ''}
          <div class="card-stars-row">
            <span class="card-stars">${renderStars(avgRating)}</span>
            <span class="card-rating-text">${ratingLabel}</span>
          </div>
        </div>
        <div class="card-actions">
          <a href="tel:${phone}" class="card-btn card-btn-call" title="Call">📞</a>
          <a href="https://wa.me/91${wa}" target="_blank" rel="noopener" class="card-btn card-btn-wa" title="WhatsApp">💬</a>
        </div>
      </div>
    `;

    card.querySelector('.card-btn-call').addEventListener('click', e => e.stopPropagation());
    card.querySelector('.card-btn-wa').addEventListener('click', e => e.stopPropagation());
    card.addEventListener('click', () => openContactDetail(contact));
    grid.appendChild(card);
  });
}

/* ─── Filter & Search ──────────────────────────────────────── */
function applyFilter() {
  const q = state.searchQuery.toLowerCase();
  state.filtered = state.contacts.filter(c => {
    const matchCat  = state.activeCategory === 'all' || c.category === state.activeCategory;
    const matchName = !q || c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
    return matchCat && matchName;
  });
  renderCards();
}

/* ─── Filter Sheet ─────────────────────────────────────────── */
function buildFilterSheet() {
  const grid = document.getElementById('filter-grid');
  grid.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'filter-item' + (cat.id === state.activeCategory ? ' active' : '');
    item.dataset.cat = cat.id;
    item.innerHTML = `<span class="filter-item-emoji">${escHtml(cat.emoji)}</span><span class="filter-item-label">${escHtml(cat.label)}</span>`;
    item.addEventListener('click', () => {
      state.activeCategory = cat.id;
      grid.querySelectorAll('.filter-item').forEach(c => c.classList.toggle('active', c.dataset.cat === cat.id));
      updateFilterButton();
      applyFilter();
      closeFilterModal();
    });
    grid.appendChild(item);
  });
}

function openFilterModal() {
  document.getElementById('filter-modal').classList.add('open');
}
function closeFilterModal() {
  document.getElementById('filter-modal').classList.remove('open');
}

function updateFilterButton() {
  const btn = document.getElementById('btn-filter');
  const label = document.getElementById('filter-label');
  const cat = CATEGORY_MAP[state.activeCategory];
  if (state.activeCategory === 'all') {
    label.textContent = 'All';
    btn.classList.remove('filtered');
  } else {
    label.textContent = `${cat.emoji} ${cat.label}`;
    btn.classList.add('filtered');
  }
}

/* ─── Connection Management ────────────────────────────────── */
// Firebase stays online for the lifetime of the tab.
function ensureOnline() { /* no-op — connection is persistent */ }

/* ─── Fetch All Data (one connection, parallel reads) ─────── */
async function fetchAllData() {
  showSkeletons();
  try {
    // Fetch categories and contacts in parallel over one connection
    const [catSnap, contactsSnap] = await Promise.all([
      db.ref('categories').once('value'),
      db.ref('contacts/approved').once('value'),
    ]);

    // Merge custom categories
    const custom = Object.entries(catSnap.val() || {}).map(([id, c]) => ({ id, ...c }));
    CATEGORIES   = [...DEFAULT_CATEGORIES, ...custom];
    CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
    buildFilterSheet();
    populateAddForm();

    // Render contacts
    hideSkeletons();
    const data = contactsSnap.val() || {};
    state.contacts = Object.entries(data).map(([id, c]) => ({ id, ...c }));
    state.contacts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    applyFilter();
  } catch {
    hideSkeletons();
    showToast('Failed to load. Check your connection and refresh.', 'error');
  }
}

function showSkeletons() {
  const grid = document.getElementById('contacts-grid');
  grid.innerHTML = `<div class="skeleton-wrap">${Array.from({ length: 4 }, () => `
    <div class="skeleton-card">
      <div class="skel skel-circle"></div>
      <div class="skel-lines">
        <div class="skel skel-line w-70"></div>
        <div class="skel skel-line w-45"></div>
        <div class="skel skel-line w-85"></div>
      </div>
    </div>`).join('')}</div>`;
}
function hideSkeletons() {
  document.getElementById('contacts-grid').innerHTML = '';
}

/* ─── Add Contact Modal ────────────────────────────────────── */
function openAddModal() {
  const overlay = document.getElementById('add-modal');
  overlay.classList.add('open');
  document.getElementById('form-name').focus();
}
function closeAddModal() {
  document.getElementById('add-modal').classList.remove('open');
  document.getElementById('add-form').reset();
  document.querySelectorAll('.form-error').forEach(e => e.textContent = '');
  document.querySelectorAll('.form-input.error').forEach(e => e.classList.remove('error'));
}

async function handleAddContact(e) {
  e.preventDefault();
  const name     = document.getElementById('form-name').value.trim();
  const phone    = document.getElementById('form-phone').value.trim().replace(/\D/g, '');
  const category = document.getElementById('form-category').value;
  const whatsapp = document.getElementById('form-whatsapp').value.trim().replace(/\D/g, '');
  const desc     = document.getElementById('form-desc').value.trim();

  let valid = true;

  if (!name) {
    setFieldError('form-name', 'Name is required');
    valid = false;
  }
  if (!phone || phone.length !== 10) {
    setFieldError('form-phone', 'Phone number must be exactly 10 digits');
    valid = false;
  }
  if (!category) {
    setFieldError('form-category', 'Please select a category');
    valid = false;
  }
  if (!valid) return;

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Checking…';
  ensureOnline();

  try {
    const approvedSnap = await db.ref('contacts/approved').orderByChild('phone').equalTo(phone).once('value');
    if (approvedSnap.exists()) {
      setFieldError('form-phone', 'This phone number is already in the directory');
      return;
    }

    submitBtn.textContent = 'Saving…';
    const contact = {
      name, phone, category,
      whatsapp: whatsapp || phone,
      description: desc || null,
      createdAt: Date.now(),
      addedBy: DEVICE_ID,
    };
    const newRef = db.ref('contacts/approved').push();
    await newRef.set(contact);
    showToast('Contact added successfully!', 'success');
    closeAddModal();
    fetchAllData();
  } catch {
    showToast('Failed to save. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Contact';
  }
}

function setFieldError(id, msg) {
  const input = document.getElementById(id);
  input.classList.add('error');
  const errEl = input.parentElement.querySelector('.form-error');
  if (errEl) errEl.textContent = msg;
  input.addEventListener('input', () => {
    input.classList.remove('error');
    if (errEl) errEl.textContent = '';
  }, { once: true });
}

/* ─── Contact Detail Modal ─────────────────────────────────── */
async function openContactDetail(contact) {
  state.openContact = contact;
  const overlay = document.getElementById('detail-modal');
  const cat = CATEGORY_MAP[contact.category] || CATEGORY_MAP['other'];
  const phone = contact.phone.replace(/\D/g, '');
  const wa    = (contact.whatsapp || contact.phone).replace(/\D/g, '');
  const avgRating = calcAvgRating(contact.ratings);
  const ratingCount = contact.ratings ? Object.keys(contact.ratings).length : 0;
  const myRating = contact.ratings ? (contact.ratings[DEVICE_ID] || 0) : 0;

  document.getElementById('detail-content').innerHTML = `
    <div class="detail-hero">
      <div class="detail-hero-bg" style="background:linear-gradient(135deg,${cat.color}22,${cat.color}08)"></div>
      <div class="detail-avatar" style="background:${cat.bg}">${escHtml(cat.emoji)}</div>
      <div class="detail-name">${escHtml(contact.name)}</div>
      <div class="detail-badge" style="background:${cat.bg};color:${cat.color}">${escHtml(cat.emoji)} ${escHtml(cat.label)}</div>
      <div class="detail-phone">📞 ${escHtml(contact.phone)}</div>
      ${contact.description ? `<div class="detail-desc">${escHtml(contact.description)}</div>` : ''}
    </div>

    <div class="detail-cta">
      <a href="tel:${phone}" class="detail-cta-btn detail-cta-call">📞 Call</a>
      <a href="https://wa.me/91${wa}" target="_blank" rel="noopener" class="detail-cta-btn detail-cta-wa">💬 WhatsApp</a>
      <button class="detail-cta-btn detail-cta-save" id="btn-save-phonebook">💾 Save</button>
    </div>

    <div class="detail-section">
      <div class="detail-section-label">Rate this service · ${avgRating > 0 ? avgRating.toFixed(1) + ' ★ avg (' + ratingCount + ')' : 'No ratings yet'}</div>
      <div class="star-picker" id="star-input" data-selected="${myRating}">
        ${[1,2,3,4,5].map(n => `<span data-val="${n}" class="${n <= myRating ? 'lit' : ''}">${n <= myRating ? '★' : '☆'}</span>`).join('')}
      </div>
      <div class="rating-note" id="rating-note">${myRating ? `You rated ${myRating} star${myRating > 1 ? 's' : ''} · tap to update` : 'Tap a star to rate'}</div>
    </div>

    <div class="detail-section">
      <div class="detail-section-label">Reviews</div>
      <div id="reviews-list"><span style="color:var(--text-muted);font-size:.82rem">Loading reviews…</span></div>
      <div class="review-form">
        <textarea class="review-textarea" id="review-input" maxlength="100" placeholder="Write a short review… (max 100 chars)"></textarea>
        <button class="btn-post-review" id="review-submit-btn">Post Review</button>
      </div>
    </div>

    <div class="detail-section detail-delete-zone">
      <button class="btn-request-delete" id="btn-request-delete">🗑 Request removal of this contact</button>
      <div class="delete-request-form" id="delete-request-form" hidden>
        <p class="delete-note">Your request will be reviewed by an admin before the contact is removed.</p>
        <textarea class="review-textarea" id="delete-reason" maxlength="200" rows="2" placeholder="Reason for removal (optional)…"></textarea>
        <div class="delete-form-actions">
          <button class="btn-confirm-delete" id="btn-confirm-delete">Submit Request</button>
          <button class="btn-cancel-delete" id="btn-cancel-delete">Cancel</button>
        </div>
      </div>
    </div>
  `;

  overlay.classList.add('open');

  // Star rating interaction
  const starInput = document.getElementById('star-input');
  starInput.querySelectorAll('span').forEach(star => {
    star.addEventListener('mouseenter', () => highlightStars(starInput, +star.dataset.val));
    star.addEventListener('mouseleave', () => highlightStars(starInput, +starInput.dataset.selected));
    star.addEventListener('click', () => submitRating(contact.id, +star.dataset.val, starInput));
  });

  // Save to phonebook
  document.getElementById('btn-save-phonebook').addEventListener('click', () => saveToPhonebook(state.openContact));

  // Review submit
  document.getElementById('review-submit-btn').addEventListener('click', () => submitReview(contact.id));

  // Delete request toggle
  document.getElementById('btn-request-delete').addEventListener('click', () => {
    document.getElementById('delete-request-form').hidden = false;
    document.getElementById('btn-request-delete').hidden = true;
    document.getElementById('delete-request-form').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  document.getElementById('btn-cancel-delete').addEventListener('click', () => {
    document.getElementById('delete-request-form').hidden = true;
    document.getElementById('btn-request-delete').hidden = false;
    document.getElementById('delete-reason').value = '';
  });
  document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
    const reason = document.getElementById('delete-reason').value.trim();
    const btn = document.getElementById('btn-confirm-delete');
    btn.disabled = true;
    btn.textContent = 'Submitting…';
    try {
      const ok = await submitDeleteRequest(contact, reason);
      if (ok) {
        showToast('Removal request submitted. Admin will review it.', 'success');
        closeDetailModal();
      }
    } catch (e) {
      console.error('Delete request failed:', e);
      showToast('Failed to submit request. Try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Request';
    }
  });

  // Load reviews
  loadReviews(contact.id);
}

function closeDetailModal() {
  document.getElementById('detail-modal').classList.remove('open');
  state.openContact = null;
}

/* ─── Ratings ──────────────────────────────────────────────── */
function calcAvgRating(ratings) {
  if (!ratings) return 0;
  const vals = Object.values(ratings);
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function highlightStars(container, val) {
  container.querySelectorAll('span').forEach((s, i) => {
    const filled = i + 1 <= val;
    s.textContent = filled ? '★' : '☆';
    s.classList.toggle('lit', filled);
  });
}

async function submitRating(contactId, val, container) {
  try {
    ensureOnline();
    await db.ref(`ratings/${contactId}/${DEVICE_ID}`).set(val);
    await db.ref(`contacts/approved/${contactId}/ratings/${DEVICE_ID}`).set(val);
    container.dataset.selected = val;
    highlightStars(container, val);
    document.getElementById('rating-note').textContent = `You rated ${val} star${val > 1 ? 's' : ''} — tap to update`;
    showToast('Rating saved!', 'success');
  } catch {
    showToast('Failed to save rating.', 'error');
  }
}

/* ─── Reviews ──────────────────────────────────────────────── */
async function loadReviews(contactId) {
  const listEl = document.getElementById('reviews-list');
  if (!listEl) return;
  try {
    ensureOnline();
    const snap = await db.ref(`reviews/${contactId}`).limitToLast(3).once('value');
    const data = snap.val();
    if (!data) {
      listEl.innerHTML = `<em style="color:var(--text-muted);font-size:.85rem">No reviews yet. Be the first!</em>`;
      return;
    }
    const items = Object.values(data).reverse();
    listEl.innerHTML = items.map(r => `
      <div class="review-card">
        <div class="review-text">${escHtml(r.text)}</div>
        <div class="review-time">${timeAgo(r.createdAt)}</div>
      </div>`).join('');
  } catch {
    listEl.innerHTML = `<em style="color:var(--text-muted);font-size:.85rem">Could not load reviews.</em>`;
  }
}

async function submitReview(contactId) {
  const input = document.getElementById('review-input');
  const text  = input.value.trim().slice(0, 100);
  if (!text) return;

  const btn = document.getElementById('review-submit-btn');
  btn.disabled = true;
  try {
    ensureOnline();
    await db.ref(`reviews/${contactId}`).push({ text, createdAt: Date.now(), deviceId: DEVICE_ID });
    input.value = '';
    showToast('Review posted!', 'success');
    loadReviews(contactId);
  } catch {
    showToast('Failed to post review.', 'error');
  } finally {
    btn.disabled = false;
  }
}

/* ─── Utilities ────────────────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function timeAgo(ts) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}


/* ─── Delete Request ─────────────────────────────────────────── */
async function submitDeleteRequest(contact, reason) {
  ensureOnline();
  await db.ref('pending_deletions').push({
    contactId:       contact.id,
    contactName:     contact.name,
    contactPhone:    contact.phone,
    contactCategory: contact.category,
    reason:          reason || '',
    requestedBy:     DEVICE_ID,
    requestedAt:     Date.now(),
  });
  return true;
}

/* ─── Phonebook Integration ─────────────────────────────────── */
async function pickFromContacts() {
  try {
    const [contact] = await navigator.contacts.select(['name', 'tel'], { multiple: false });
    if (!contact) return;
    const name = contact.name?.[0] || '';
    const tel  = (contact.tel?.[0] || '').replace(/\D/g, '').slice(-10);
    if (name) document.getElementById('form-name').value = name;
    if (tel)  document.getElementById('form-phone').value = tel;
    ['form-name', 'form-phone'].forEach(id => {
      document.getElementById(id).classList.remove('error');
      const errEl = document.getElementById(id).parentElement.querySelector('.form-error');
      if (errEl) errEl.textContent = '';
    });
  } catch (e) {
    if (e.name !== 'AbortError') showToast('Could not access contacts.', 'error');
  }
}

function saveToPhonebook(contact) {
  const phone = contact.phone.replace(/\D/g, '');
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${contact.name}`,
    `TEL;TYPE=CELL:+91${phone}`,
  ];
  if (contact.description) lines.push(`NOTE:${contact.description}`);
  lines.push('END:VCARD');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/vcard' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${contact.name.replace(/\s+/g, '_')}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Contact file downloaded — open it to save to phonebook.', 'success');
}

/* ─── Bootstrap ────────────────────────────────────────────── */
function populateAddForm() {
  const sel = document.getElementById('form-category');
  const prev = sel.value;
  sel.innerHTML = '<option value="">Select a category…</option>';
  CATEGORIES.filter(c => c.id !== 'all').forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = `${cat.emoji} ${cat.label}`;
    sel.appendChild(opt);
  });
  sel.value = prev;
}

document.addEventListener('DOMContentLoaded', async () => {
  // Search clear button
  const searchInput = document.getElementById('search-input');
  const clearBtn    = document.getElementById('search-clear');
  searchInput.addEventListener('input', () => {
    clearBtn.classList.toggle('visible', searchInput.value.length > 0);
  });
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.classList.remove('visible');
    searchInput.dispatchEvent(new Event('input'));
    searchInput.focus();
  });

  // Empty state add button
  document.getElementById('btn-add-empty').addEventListener('click', () => {
    document.getElementById('btn-add').click();
  });

  // Firebase config guard
  if (typeof firebaseConfig === 'undefined' || firebaseConfig.apiKey === 'YOUR_API_KEY') {
    document.getElementById('config-warning').hidden = false;
    showSkeletons();
    return;
  }

  if (!initFirebase()) return;

  buildFilterSheet();
  populateAddForm();
  fetchAllData();

  // Search
  document.getElementById('search-input').addEventListener('input', e => {
    state.searchQuery = e.target.value;
    applyFilter();
  });

  // Add button
  document.getElementById('btn-add').addEventListener('click', openAddModal);
  document.getElementById('btn-add-fab').addEventListener('click', openAddModal);

  // Add modal close
  document.getElementById('add-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeAddModal();
  });
  document.getElementById('close-add-modal').addEventListener('click', closeAddModal);
  document.getElementById('add-form').addEventListener('submit', handleAddContact);

  // Detail modal close
  document.getElementById('detail-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDetailModal();
  });
  document.getElementById('close-detail-modal').addEventListener('click', closeDetailModal);

  // Filter modal
  document.getElementById('btn-filter').addEventListener('click', openFilterModal);
  document.getElementById('filter-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeFilterModal();
  });
  document.getElementById('close-filter-modal').addEventListener('click', closeFilterModal);

  // Contact picker (show button only if API supported)
  if ('contacts' in navigator && 'ContactsManager' in window) {
    document.getElementById('contact-picker-row').hidden = false;
    document.getElementById('btn-pick-contact').addEventListener('click', pickFromContacts);
  }
});
