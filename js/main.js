/* ============================================================
   main.js — Patent widget & listing page logic
   ============================================================ */

const DATA_PATH = 'data/patents.json';
const isPatentsPage = document.getElementById('patentList') !== null;

// ── Shared: footer year ──────────────────────────────────────
const fyEl = document.getElementById('footerYear');
if (fyEl) fyEl.textContent = new Date().getFullYear();

// ── Apply display name to title, heading, footer ─────────────
function applyDisplayName(name) {
  if (!name) return;
  const siteNameEl  = document.getElementById('siteName');
  const footerNameEl = document.getElementById('footerName');
  if (siteNameEl)   siteNameEl.textContent  = name;
  if (footerNameEl) footerNameEl.textContent = name;
  // Update <title> tag
  if (isPatentsPage) {
    document.title = `Patents — ${name}`;
  } else {
    document.title = name;
  }
}

// ── Animated count-up ────────────────────────────────────────
function animateCount(el, target, duration = 1200) {
  const start = performance.now();
  el.style.animation = 'countUp 0.4s ease both';

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }

  requestAnimationFrame(step);
}

// ── Format date string ───────────────────────────────────────
function formatDate(isoStr) {
  if (!isoStr) return '';
  // USPTO returns YYYYMMDD (e.g. "20231205") — convert to ISO before parsing
  let s = /^\d{8}$/.test(isoStr)
    ? `${isoStr.slice(0,4)}-${isoStr.slice(4,6)}-${isoStr.slice(6)}`
    : isoStr;
  const d = new Date(s + 'T00:00:00'); // avoid timezone shifts
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── USPTO patent URL ─────────────────────────────────────────
function usptoUrl(patentNumber) {
  // Remove any non-digit prefix for the URL (e.g. "US" or "D" design prefix)
  return `https://patents.google.com/patent/US${patentNumber}`;
}

// ── Load patents.json ────────────────────────────────────────
async function loadPatents() {
  const res = await fetch(DATA_PATH);
  if (!res.ok) throw new Error(`Failed to load patent data (${res.status})`);
  return res.json();
}

// ============================================================
// HOME PAGE — Patent count widget
// ============================================================
async function initWidget() {
  const countEl = document.getElementById('patentCount');
  const lastUpdEl = document.getElementById('patentLastUpdated');
  if (!countEl) return;

  try {
    const data = await loadPatents();
    applyDisplayName(data.display_name);
    const total = data.patents ? data.patents.length : 0;

    animateCount(countEl, total);

    if (lastUpdEl && data.last_updated) {
      lastUpdEl.textContent = `Updated ${formatDate(data.last_updated)}`;
    }
  } catch (err) {
    console.error('Patent widget error:', err);
    countEl.textContent = '—';
    countEl.style.fontSize = '1.5rem';
  }
}

// ============================================================
// PATENTS PAGE — Full listing
// ============================================================
let allPatents = [];

function renderList(patents) {
  const listEl = document.getElementById('patentList');
  const noResultsEl = document.getElementById('noResults');
  const badgeEl = document.getElementById('visibleCount');

  if (!listEl) return;

  if (patents.length === 0) {
    listEl.innerHTML = '';
    if (noResultsEl) noResultsEl.classList.remove('hidden');
    if (badgeEl) badgeEl.textContent = '0 results';
    return;
  }

  if (noResultsEl) noResultsEl.classList.add('hidden');
  if (badgeEl) {
    badgeEl.textContent = patents.length === allPatents.length
      ? `${patents.length} patents`
      : `${patents.length} of ${allPatents.length}`;
  }

  listEl.innerHTML = patents.map((p, i) => {
    const url = usptoUrl(p.number);
    const date = formatDate(p.date);
    return `
      <li class="patent-item"
          style="animation-delay: ${Math.min(i * 0.04, 0.6)}s"
          onclick="window.open('${url}','_blank','noopener')"
          onkeydown="if(event.key==='Enter'||event.key===' ')window.open('${url}','_blank','noopener')"
          tabindex="0"
          role="link"
          aria-label="US ${p.number} — ${escapeHtml(p.title)}">
        <div class="patent-meta">
          <span class="patent-number">US ${p.number}</span>
          ${date ? `<span class="patent-date">${date}</span>` : ''}
        </div>
        <span class="patent-title">${escapeHtml(p.title)}</span>
      </li>`;
  }).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function filterPatents(query) {
  if (!query) return allPatents;
  const q = query.toLowerCase();
  return allPatents.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.number.toLowerCase().includes(q)
  );
}

async function initPatentsPage() {
  const subtitleEl = document.getElementById('patentPageSubtitle');
  const searchEl = document.getElementById('patentSearch');
  const listEl = document.getElementById('patentList');

  if (!listEl) return;

  try {
    const data = await loadPatents();
    applyDisplayName(data.display_name);
    allPatents = data.patents || [];

    if (subtitleEl) {
      subtitleEl.textContent = `${allPatents.length} granted patent${allPatents.length !== 1 ? 's' : ''}`;
    }

    renderList(allPatents);

    if (searchEl) {
      searchEl.addEventListener('input', () => {
        renderList(filterPatents(searchEl.value.trim()));
      });
    }
  } catch (err) {
    console.error('Patents page error:', err);
    if (listEl) {
      listEl.innerHTML = '<li class="patent-placeholder">Unable to load patent data. Please try again later.</li>';
    }
    if (subtitleEl) subtitleEl.textContent = '';
  }
}

// ── Route ────────────────────────────────────────────────────
if (isPatentsPage) {
  initPatentsPage();
} else {
  initWidget();
}
