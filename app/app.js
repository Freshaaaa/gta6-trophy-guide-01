// The Leonida Trophy Fieldbook: tracker for the 55 GTA 6 trophies.
// Progress lives in localStorage; the list, filters, spoiler setting and detail panel render from data/trophies.json.
const STORAGE_KEY = 'leonida-fieldbook-progress-v1';
const DEFAULT_SELECTED_ID = 28;

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

const earned = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
const byId = new Map(trophies.map((t) => [t.id, t]));

const el = (id) => document.getElementById(id);
const listEl = el('trophyList');
const detailEl = el('detailPanel');

const state = {
  search: '',
  kind: 'all',
  grade: 'all',
  missableOnly: false,
  earnedOnly: false,
  spoiler: false,
  selectedId: DEFAULT_SELECTED_ID,
  tab: 'tracker',
};

function saveEarned() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function isMasked(t) {
  return state.spoiler && t.hidden && !earned.has(t.id);
}

function visibleTrophies() {
  const q = state.search.trim().toLowerCase();
  return trophies.filter((t) => {
    if (state.kind !== 'all' && t.kind !== state.kind) return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.missableOnly && !t.missable) return false;
    if (state.earnedOnly && !earned.has(t.id)) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))) return false;
    return true;
  });
}

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function renderProgress() {
  const total = trophies.length;
  const done = earned.size;
  const pct = Math.round((done / total) * 100);
  el('progressCount').textContent = `${done}/${total}`;
  el('progressPct').textContent = `${pct}%`;
  el('progressFill').style.width = `${pct}%`;
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const totals = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) {
    totals[t.grade] += 1;
    if (earned.has(t.id)) counts[t.grade] += 1;
  }
  el('gradeCounts').innerHTML = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `<li><b>${counts[g]}/${totals[g]}</b> ${gradeLabel(g)}</li>`)
    .join('');
}

function renderTrophyList() {
  const shown = visibleTrophies();
  el('shownCount').textContent = `Showing ${shown.length} of ${trophies.length} trophies.`;
  el('spoilerNote').hidden = !state.spoiler;
  listEl.replaceChildren();
  if (shown.length === 0) {
    const li = document.createElement('li');
    li.className = 'trophy-empty';
    li.textContent = 'No trophies match these filters.';
    listEl.append(li);
    return;
  }
  for (const t of shown) {
    const masked = isMasked(t);
    const li = document.createElement('li');
    if (earned.has(t.id)) li.classList.add('earned');
    if (t.id === state.selectedId) li.classList.add('selected');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', `Mark ${t.name} as earned`);
    box.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleEarned(t.id, box.checked);
    });
    const main = document.createElement('div');
    main.className = 'trophy-main';
    const name = document.createElement('div');
    name.className = 'trophy-name';
    name.textContent = masked ? 'Hidden trophy' : t.name;
    if (masked) {
      const tag = document.createElement('span');
      tag.className = 'hidden-tag';
      tag.textContent = ' — hidden until earned';
      name.append(tag);
    }
    const desc = document.createElement('div');
    desc.className = 'trophy-desc';
    desc.textContent = masked ? 'A story trophy. Earn it to reveal its name and description.' : t.description;
    const tags = document.createElement('div');
    tags.className = 'trophy-tags';
    const gradeTag = document.createElement('span');
    gradeTag.className = `tag grade-${t.grade}`;
    gradeTag.textContent = gradeLabel(t.grade);
    tags.append(gradeTag);
    const kindTag = document.createElement('span');
    kindTag.className = 'tag';
    kindTag.textContent = t.kind;
    tags.append(kindTag);
    if (t.missable) {
      const missTag = document.createElement('span');
      missTag.className = 'tag missable';
      missTag.textContent = 'Missable';
      tags.append(missTag);
    }
    main.append(name, desc, tags);
    li.append(box, main);
    li.addEventListener('click', () => selectTrophy(t.id));
    listEl.append(li);
  }
}

function renderTrophyDetail() {
  const t = byId.get(state.selectedId) ?? trophies[0];
  if (!t) {
    detailEl.textContent = '';
    return;
  }
  const masked = isMasked(t);
  detailEl.replaceChildren();
  if (masked) {
    const h = document.createElement('h3');
    h.textContent = 'Hidden trophy';
    const p = document.createElement('p');
    p.className = 'official-desc';
    p.textContent = 'This story trophy stays hidden while spoilers are on. Earn it (or turn spoilers off) to see its name, description and guide.';
    const meta = document.createElement('div');
    meta.className = 'detail-meta';
    const gradeTag = document.createElement('span');
    gradeTag.className = `tag grade-${t.grade}`;
    gradeTag.textContent = gradeLabel(t.grade);
    meta.append(gradeTag);
    detailEl.append(h, meta, p);
    return;
  }
  const h = document.createElement('h3');
  h.textContent = t.name;
  const desc = document.createElement('p');
  desc.className = 'official-desc';
  desc.textContent = `“${t.description}”`;
  const meta = document.createElement('div');
  meta.className = 'detail-meta';
  const gradeTag = document.createElement('span');
  gradeTag.className = `tag grade-${t.grade}`;
  gradeTag.textContent = gradeLabel(t.grade);
  meta.append(gradeTag);
  const kindTag = document.createElement('span');
  kindTag.className = 'tag';
  kindTag.textContent = t.kind;
  meta.append(kindTag);
  if (t.missable) {
    const missTag = document.createElement('span');
    missTag.className = 'tag missable';
    missTag.textContent = 'Missable';
    meta.append(missTag);
  }
  const guide = document.createElement('div');
  guide.className = 'guide';
  if (t.guide.startsWith('UNCONFIRMED')) {
    const warn = document.createElement('p');
    warn.className = 'unconfirmed';
    warn.textContent = 'Unconfirmed — the exact steps are not yet verified. This guide will not invent them.';
    guide.append(warn);
  }
  const body = document.createElement('p');
  body.textContent = t.guide.replace(/^UNCONFIRMED — check back\. /, '');
  guide.append(body);
  const sources = document.createElement('div');
  sources.className = 'sources';
  const strong = document.createElement('strong');
  strong.textContent = 'Sources';
  sources.append(strong);
  const ul = document.createElement('ul');
  for (const s of t.sources) {
    const li = document.createElement('li');
    li.textContent = s;
    ul.append(li);
  }
  sources.append(ul);
  const earnedLine = document.createElement('p');
  earnedLine.className = 'earned-line';
  earnedLine.textContent = earned.has(t.id) ? 'Earned — ticked in your tracker.' : 'Not earned yet.';
  const markBtn = document.createElement('button');
  markBtn.type = 'button';
  markBtn.className = 'mark-btn';
  markBtn.textContent = earned.has(t.id) ? 'Mark as not earned' : 'Mark as earned';
  markBtn.addEventListener('click', () => toggleEarned(t.id, !earned.has(t.id)));
  detailEl.append(h, desc, meta, guide, sources, earnedLine, markBtn);
}

function renderMissableList() {
  const list = el('missableList');
  list.replaceChildren();
  const strands = trophies.filter((t) => t.missable && t.id !== 28);
  for (const t of strands) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'missable-name';
    name.textContent = `${t.name} — `;
    const why = document.createElement('span');
    why.className = 'missable-why';
    why.textContent = t.id === 25
      ? 'Finish 8 stranger strands. Each strand is time-limited, so start them early.'
      : t.id === 29
        ? 'Hunt a unique animal for Bret. Bret’s quests are time-limited and needed in full for 100%.'
        : 'A stranger’s final mission. The strand is time-limited — start early and finish it before the story moves on.';
    li.append(name, why);
    list.append(li);
  }
}

function renderAll() {
  renderProgress();
  renderTrophyList();
  renderTrophyDetail();
}

function selectTrophy(id) {
  state.selectedId = id;
  renderTrophyList();
  renderTrophyDetail();
}

function toggleEarned(id, value) {
  if (value) earned.add(id);
  else earned.delete(id);
  saveEarned();
  renderAll();
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned].sort((a, b) => a - b) }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgress(file) {
  if (!file) return;
  const data = JSON.parse(await file.text());
  const ids = Array.isArray(data) ? data : data.earned;
  earned.clear();
  for (const id of ids ?? []) {
    if (byId.has(Number(id))) earned.add(Number(id));
  }
  saveEarned();
  renderAll();
}

function resetProgress() {
  if (!window.confirm('Reset all progress? This clears every tick.')) return;
  earned.clear();
  saveEarned();
  renderAll();
}

function switchTab(name) {
  state.tab = name;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${name}`));
}

function applyUrlState() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab && ['tracker', 'roadmap', 'missables', 'sources'].includes(tab)) state.tab = tab;
  if (params.get('spoiler') === '1') state.spoiler = true;
  if (params.get('missable') === '1') state.missableOnly = true;
  if (params.get('earned') === '1') state.earnedOnly = true;
  if (params.get('kind')) state.kind = params.get('kind');
  if (params.get('grade')) state.grade = params.get('grade');
  if (params.get('search')) state.search = params.get('search');
  const select = Number(params.get('select'));
  if (byId.has(select)) state.selectedId = select;
}

applyUrlState();

el('search').value = state.search;
el('kindFilter').value = state.kind;
el('gradeFilter').value = state.grade;
el('missableOnly').checked = state.missableOnly;
el('earnedOnly').checked = state.earnedOnly;
el('spoilerToggle').checked = state.spoiler;

el('search').addEventListener('input', (e) => { state.search = e.target.value; renderTrophyList(); });
el('kindFilter').addEventListener('change', (e) => { state.kind = e.target.value; renderTrophyList(); });
el('gradeFilter').addEventListener('change', (e) => { state.grade = e.target.value; renderTrophyList(); });
el('missableOnly').addEventListener('change', (e) => { state.missableOnly = e.target.checked; renderTrophyList(); });
el('earnedOnly').addEventListener('change', (e) => { state.earnedOnly = e.target.checked; renderTrophyList(); });
el('spoilerToggle').addEventListener('change', (e) => { state.spoiler = e.target.checked; renderAll(); });
el('exportBtn').addEventListener('click', exportProgress);
el('importFile').addEventListener('change', (e) => importProgress(e.target.files[0]));
el('resetBtn').addEventListener('click', resetProgress);
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

switchTab(state.tab);
renderMissableList();
renderAll();
