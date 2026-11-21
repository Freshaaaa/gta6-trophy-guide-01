// The Leonida Trophy Fieldbook v2: tracker for the 55 GTA 6 trophies.
// Progress and counter values live in localStorage; the list, filters, spoiler setting and detail panel render from data/trophies.json.
const STORAGE_KEY = 'leonida-fieldbook-progress-v1';
const COUNTER_KEY = 'leonida-fieldbook-counters-v1';
const DEFAULT_SELECTED_ID = 28;
const DEMO_EARNED = [2, 3, 8, 17, 20, 21, 46, 54];

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

const earned = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
const counters = new Map(Object.entries(JSON.parse(localStorage.getItem(COUNTER_KEY) ?? '{}')).map(([k, v]) => [Number(k), Number(v)]));
const byId = new Map(trophies.map((t) => [t.id, t]));

const STAGES = {
  1: { title: 'Stage 1 · The story', sub: '60–80 hours' },
  2: { title: 'Stage 2 · 100% completion', sub: '~100 hours' },
  3: { title: 'Stage 3 · Cleanup', sub: '~10 hours' },
};
const KIND_ORDER = ['story', 'side story', 'collectibles', 'activities', 'robbery', 'exploration & misc', '100% completion'];
const KIND_LABEL = {
  'story': 'Story',
  'side story': 'Side story',
  'collectibles': 'Collectibles',
  'activities': 'Activities',
  'robbery': 'Robbery',
  'exploration & misc': 'Exploration & misc',
  '100% completion': '100% completion',
};
const SOURCE_TAGS = [
  ['PowerPyx', 'PPX'],
  ['OutputLag', 'OL'],
  ['Exophase', 'EXO'],
  ['GTABase', 'GTB'],
  ['KeenGamer', 'KG'],
  ['EGamers', 'EG'],
];
// Prefixes in the order the sources array lists them, for inline [n] citations.
const SOURCE_PREFIXES = ['PowerPyx', 'OutputLag', 'Exophase', 'GTABase', 'KeenGamer', 'EGamers', 'TechWiser', 'GTA Zone'];

// Split a guide into its sentences and the sources its own "Source:" line names.
// The facts never change: the "Source:" sentence is lifted out of the body and
// becomes the inline citations, so the steps read as numbered steps with [n] tags.
function guideParts(t) {
  const raw = t.guide.replace(/^UNCONFIRMED — check back\. /, '');
  const srcAt = raw.search(/\s*Source: /);
  const body = srcAt >= 0 ? raw.slice(0, srcAt) : raw;
  const srcLine = srcAt >= 0 ? raw.slice(srcAt) : '';
  const steps = body.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const citeIdx = [];
  for (const prefix of SOURCE_PREFIXES) {
    if (!srcLine.includes(prefix)) continue;
    const i = t.sources.findIndex((s) => s.startsWith(prefix));
    if (i >= 0) citeIdx.push(i + 1);
  }
  return { steps, citeIdx };
}

// The missable "why" is the guide's own sentence that names the risk:
// a time-limited strand, a spot that is only there in Chapter 1, or a missable moment.
function missableWhy(t) {
  const { steps } = guideParts(t);
  return steps.find((s) => /time-limited|only available|Chapter 1|missable/i.test(s)) ?? steps[0] ?? t.description;
}

// Roadmap order: stage first, then id (platinum #1 sorts first inside Stage 3, as the goal).
const ROADMAP_ORDER = [...trophies].sort((a, b) => (a.stage - b.stage) || (a.id - b.id));
const roadmapIndex = new Map(ROADMAP_ORDER.map((t, i) => [t.id, i]));

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

function saveCounters() {
  localStorage.setItem(COUNTER_KEY, JSON.stringify(Object.fromEntries(counters)));
}

function isMasked(t) {
  return state.spoiler && t.hidden && !earned.has(t.id);
}

function visibleTrophies() {
  const q = state.search.trim().toLowerCase();
  return ROADMAP_ORDER.filter((t) => {
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

function sourceTagsFor(t) {
  const tags = [];
  for (const [prefix, tag] of SOURCE_TAGS) {
    if (t.sources.some((s) => s.startsWith(prefix))) tags.push(tag);
  }
  return tags;
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

function renderStageStrip() {
  const strip = el('stageStrip');
  strip.replaceChildren();
  for (const stage of [1, 2, 3]) {
    const total = trophies.filter((t) => t.stage === stage).length;
    const done = trophies.filter((t) => t.stage === stage && earned.has(t.id)).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const seg = document.createElement('button');
    seg.type = 'button';
    seg.className = 'stage-seg';
    seg.title = `${STAGES[stage].title} — jump to its trophies in the list`;
    const label = document.createElement('span');
    label.className = 'stage-seg-label';
    label.textContent = `S${stage} ${done}/${total}`;
    const bar = document.createElement('span');
    bar.className = 'stage-seg-bar';
    const fill = document.createElement('span');
    fill.className = 'stage-seg-fill';
    fill.style.width = `${pct}%`;
    bar.append(fill);
    const name = document.createElement('span');
    name.className = 'stage-seg-name';
    name.textContent = STAGES[stage].title.replace(/^Stage \d+ · /, '');
    seg.append(label, bar, name);
    seg.addEventListener('click', () => {
      document.querySelectorAll('.stage-group')[stage - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    strip.append(seg);
  }
}

function renderAuditBar() {
  const total = trophies.length;
  const guided = trophies.filter((t) => t.guide && t.guide.trim().length > 0).length;
  const cited = trophies.filter((t) => Array.isArray(t.sources) && t.sources.length > 0).length;
  const hidden = trophies.filter((t) => t.hidden).length;
  const missable = trophies.filter((t) => t.missable).length;
  const unconfirmed = trophies.filter((t) => t.unconfirmed).length;
  el('auditBar').innerHTML = `<b>SELF-AUDIT</b> · ${total}/${total} trophies · ${guided}/${total} guides · ${cited}/${total} cited · ${hidden}/${hidden} hidden · ${missable} missable · ${unconfirmed} unconfirmed — listed honestly · Sources retrieved 19 Nov 2026`;
}

function nextUnearned() {
  return ROADMAP_ORDER.find((t) => !earned.has(t.id)) ?? null;
}

function renderNextUp() {
  const bar = el('nextUpBar');
  bar.replaceChildren();
  const next = nextUnearned();
  if (!next) {
    bar.textContent = 'Platinum earned — every trophy is ticked. Vice Got a Price! is yours.';
    return;
  }
  const label = document.createElement('span');
  label.className = 'nextup-label';
  label.textContent = 'Next up';
  const text = document.createElement('span');
  text.textContent = ` #${next.id} ${next.name} — ${STAGES[next.stage].title} · ${next.kind}`;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Show it';
  btn.addEventListener('click', () => selectTrophy(next.id));
  bar.append(label, text, btn);
}

function renderChips() {
  const chipsEl = el('chips');
  chipsEl.replaceChildren();
  const counts = {};
  const earnedCounts = {};
  for (const t of trophies) {
    counts[t.kind] = (counts[t.kind] ?? 0) + 1;
    if (earned.has(t.id)) earnedCounts[t.kind] = (earnedCounts[t.kind] ?? 0) + 1;
  }
  const missableTotal = trophies.filter((t) => t.missable).length;
  const missableEarned = trophies.filter((t) => t.missable && earned.has(t.id)).length;
  const makeChip = (label, active, onClick, missableChip = false) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (active ? ' active' : '') + (missableChip ? ' missable-chip' : '');
    b.textContent = label;
    b.addEventListener('click', onClick);
    chipsEl.append(b);
  };
  makeChip(`All ${earned.size}/${trophies.length}`, state.kind === 'all' && !state.missableOnly, () => {
    state.kind = 'all';
    state.missableOnly = false;
    el('missableOnly').checked = false;
    renderChips();
    renderTrophyList();
  });
  for (const kind of KIND_ORDER) {
    makeChip(`${KIND_LABEL[kind]} ${earnedCounts[kind] ?? 0}/${counts[kind]}`, state.kind === kind && !state.missableOnly, () => {
      state.kind = kind;
      state.missableOnly = false;
      el('missableOnly').checked = false;
      renderChips();
      renderTrophyList();
    });
  }
  makeChip(`Missable ${missableEarned}/${missableTotal}`, state.missableOnly, () => {
    state.missableOnly = !state.missableOnly;
    el('missableOnly').checked = state.missableOnly;
    renderChips();
    renderTrophyList();
  }, true);
}

function trophyRow(t) {
  const masked = isMasked(t);
  const li = document.createElement('li');
  li.className = 'trophy-row';
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
  const stageTag = document.createElement('span');
  stageTag.className = 'tag stage-tag';
  stageTag.textContent = t.chapter ? `S${t.stage} · ${t.chapter}` : `S${t.stage}`;
  tags.append(stageTag);
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
  if (t.target) {
    const count = counters.get(t.id) ?? 0;
    const targetTag = document.createElement('span');
    targetTag.className = 'tag';
    targetTag.textContent = `Target: ${count}/${t.target.n}`;
    tags.append(targetTag);
  }
  for (const tagText of sourceTagsFor(t)) {
    const srcTag = document.createElement('span');
    srcTag.className = 'tag source-tag';
    srcTag.textContent = tagText;
    tags.append(srcTag);
  }
  main.append(name, desc, tags);
  li.append(box, main);
  li.addEventListener('click', () => selectTrophy(t.id));
  return li;
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
  for (const stage of [1, 2, 3]) {
    const group = shown.filter((t) => t.stage === stage);
    if (group.length === 0) continue;
    const groupEl = document.createElement('div');
    groupEl.className = 'stage-group';
    const head = document.createElement('div');
    head.className = 'stage-group-head';
    const title = document.createElement('h3');
    title.textContent = `${STAGES[stage].title} — ${STAGES[stage].sub}`;
    const count = document.createElement('span');
    count.className = 'stage-count';
    const stageTotal = trophies.filter((t) => t.stage === stage).length;
    const stageEarned = trophies.filter((t) => t.stage === stage && earned.has(t.id)).length;
    count.textContent = `${stageEarned}/${stageTotal} earned`;
    head.append(title, count);
    groupEl.append(head);
    for (const t of group) groupEl.append(trophyRow(t));
    listEl.append(groupEl);
  }
}

function difficultyDots(n) {
  return '●'.repeat(n) + '○'.repeat(Math.max(0, 5 - n));
}

function renderCounter(t) {
  const wrap = document.createElement('div');
  wrap.className = 'counter';
  const label = document.createElement('span');
  label.className = 'counter-label';
  label.textContent = 'Counter';
  const minus = document.createElement('button');
  minus.type = 'button';
  minus.textContent = '−';
  minus.setAttribute('aria-label', 'Decrease counter');
  const value = document.createElement('span');
  value.className = 'counter-value';
  const count = counters.get(t.id) ?? 0;
  value.innerHTML = `${count} <small>/ ${t.target.n} ${t.target.unit}</small>`;
  const plus = document.createElement('button');
  plus.type = 'button';
  plus.textContent = '+';
  plus.setAttribute('aria-label', 'Increase counter');
  minus.disabled = count <= 0;
  plus.disabled = count >= t.target.n;
  minus.addEventListener('click', () => {
    counters.set(t.id, Math.max(0, (counters.get(t.id) ?? 0) - 1));
    saveCounters();
    renderTrophyDetail();
    renderTrophyList();
  });
  plus.addEventListener('click', () => {
    counters.set(t.id, Math.min(t.target.n, (counters.get(t.id) ?? 0) + 1));
    saveCounters();
    renderTrophyDetail();
    renderTrophyList();
  });
  wrap.append(label, minus, value, plus);
  if (count >= t.target.n) {
    const done = document.createElement('span');
    done.className = 'counter-done';
    done.textContent = 'Target reached — mark it earned.';
    wrap.append(done);
  }
  return wrap;
}

function renderTrophyDetail() {
  const t = byId.get(state.selectedId) ?? ROADMAP_ORDER[0];
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
  const stageTag = document.createElement('span');
  stageTag.className = 'tag stage-tag';
  stageTag.textContent = t.chapter ? `S${t.stage} · ${t.chapter}` : `S${t.stage}`;
  meta.append(stageTag);
  const kindTag = document.createElement('span');
  kindTag.className = 'tag';
  kindTag.textContent = t.kind;
  meta.append(kindTag);
  if (t.target) {
    const targetTag = document.createElement('span');
    targetTag.className = 'tag target-tag';
    targetTag.textContent = `TARGET: ${t.target.n}`;
    meta.append(targetTag);
  }
  if (t.missable) {
    const missTag = document.createElement('span');
    missTag.className = 'tag missable';
    missTag.textContent = 'Missable';
    meta.append(missTag);
  }
  const diffTime = document.createElement('p');
  diffTime.className = 'diff-time';
  const dots = document.createElement('span');
  dots.className = 'dots';
  dots.textContent = difficultyDots(t.difficulty);
  diffTime.append('Difficulty ', dots, ` · Time ${t.time}`);
  const guide = document.createElement('div');
  guide.className = 'guide';
  if (t.guide.startsWith('UNCONFIRMED')) {
    const warn = document.createElement('p');
    warn.className = 'unconfirmed';
    warn.textContent = 'Unconfirmed — the exact steps are not yet verified. This guide will not invent them.';
    guide.append(warn);
  }
  const { steps, citeIdx } = guideParts(t);
  const guideHead = document.createElement('p');
  guideHead.className = 'guide-head';
  guideHead.textContent = 'HOW TO GET IT — in our own words';
  guide.append(guideHead);
  const ol = document.createElement('ol');
  ol.className = 'guide-steps';
  for (const step of steps) {
    const li = document.createElement('li');
    li.textContent = step;
    for (const n of citeIdx) {
      const sup = document.createElement('sup');
      sup.className = 'cite';
      sup.textContent = `[${n}]`;
      li.append(' ', sup);
    }
    ol.append(li);
  }
  guide.append(ol);
  if (t.missable || t.unresolved) {
    const row = document.createElement('div');
    row.className = 'info-boxes';
    if (t.missable) {
      const box = document.createElement('div');
      box.className = 'info-box missable-box';
      const head = document.createElement('p');
      head.className = 'info-box-head';
      head.textContent = t.unresolved ? 'MISSABLE? POSSIBLY' : 'MISSABLE? YES';
      const why = document.createElement('p');
      why.textContent = missableWhy(t);
      box.append(head, why);
      row.append(box);
    }
    if (t.unresolved) {
      const box = document.createElement('div');
      box.className = 'info-box unresolved-box';
      const head = document.createElement('p');
      head.className = 'info-box-head';
      head.textContent = 'NOT PINNED DOWN YET';
      const why = document.createElement('p');
      why.textContent = t.unresolved.replace(/^Not pinned down yet — /, '');
      box.append(head, why);
      row.append(box);
    }
    guide.append(row);
  }
  const sources = document.createElement('div');
  sources.className = 'sources';
  const strong = document.createElement('strong');
  strong.textContent = 'Sources';
  sources.append(strong);
  const ul = document.createElement('ul');
  t.sources.forEach((s, i) => {
    const li = document.createElement('li');
    const n = document.createElement('b');
    n.className = 'source-no';
    n.textContent = `[${i + 1}] `;
    li.append(n, document.createTextNode(s));
    ul.append(li);
  });
  sources.append(ul);
  const earnedLine = document.createElement('p');
  earnedLine.className = 'earned-line';
  earnedLine.textContent = earned.has(t.id) ? 'Earned — ticked in your tracker.' : 'Not earned yet.';
  const markBtn = document.createElement('button');
  markBtn.type = 'button';
  markBtn.className = 'mark-btn';
  markBtn.textContent = earned.has(t.id) ? 'Mark as not earned' : 'Mark as earned';
  markBtn.addEventListener('click', () => toggleEarned(t.id, !earned.has(t.id)));
  detailEl.append(h, desc, meta, diffTime);
  if (t.target) detailEl.append(renderCounter(t));
  detailEl.append(guide, sources, earnedLine, markBtn);
  // Previous / Next in roadmap order + next-up line.
  const idx = roadmapIndex.get(t.id);
  const nav = document.createElement('div');
  nav.className = 'nav-btns';
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.textContent = '← Previous';
  prevBtn.disabled = idx <= 0;
  prevBtn.addEventListener('click', () => selectTrophy(ROADMAP_ORDER[idx - 1].id));
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.textContent = 'Next →';
  nextBtn.disabled = idx >= ROADMAP_ORDER.length - 1;
  nextBtn.addEventListener('click', () => selectTrophy(ROADMAP_ORDER[idx + 1].id));
  nav.append(prevBtn, nextBtn);
  detailEl.append(nav);
  const next = nextUnearned();
  if (next && next.id !== t.id) {
    const line = document.createElement('p');
    line.className = 'nextup-line';
    line.textContent = `Next up: #${next.id} ${next.name} — ${STAGES[next.stage].title}.`;
    const showBtn = document.createElement('button');
    showBtn.type = 'button';
    showBtn.textContent = 'Show it';
    showBtn.addEventListener('click', () => selectTrophy(next.id));
    line.append(showBtn);
    detailEl.append(line);
  }
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
  renderStageStrip();
  renderAuditBar();
  renderNextUp();
  renderChips();
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
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned].sort((a, b) => a - b), counters: Object.fromEntries(counters) }, null, 2)], { type: 'application/json' });
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
  if (data && typeof data === 'object' && data.counters) {
    counters.clear();
    for (const [k, v] of Object.entries(data.counters)) {
      const t = byId.get(Number(k));
      if (t && t.target) counters.set(Number(k), Math.max(0, Math.min(t.target.n, Number(v))));
    }
    saveCounters();
  }
  saveEarned();
  renderAll();
}

function resetProgress() {
  if (!window.confirm('Reset all progress? This clears every tick and counter.')) return;
  earned.clear();
  counters.clear();
  saveEarned();
  saveCounters();
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
  // Demo seed for screenshots: ?demo=1 ticks a fixed 8-trophy sample (and a 6/18 meditation counter) when nothing is saved yet.
  if (params.get('demo') === '1' && earned.size === 0 && counters.size === 0) {
    for (const id of DEMO_EARNED) earned.add(id);
    counters.set(28, 6);
    saveEarned();
    saveCounters();
  }
}

applyUrlState();

el('search').value = state.search;
el('gradeFilter').value = state.grade;
el('missableOnly').checked = state.missableOnly;
el('earnedOnly').checked = state.earnedOnly;
el('spoilerToggle').checked = state.spoiler;

el('search').addEventListener('input', (e) => { state.search = e.target.value; renderTrophyList(); });
el('gradeFilter').addEventListener('change', (e) => { state.grade = e.target.value; renderTrophyList(); });
el('missableOnly').addEventListener('change', (e) => { state.missableOnly = e.target.checked; renderChips(); renderTrophyList(); });
el('earnedOnly').addEventListener('change', (e) => { state.earnedOnly = e.target.checked; renderTrophyList(); });
el('spoilerToggle').addEventListener('change', (e) => { state.spoiler = e.target.checked; renderAll(); });
el('exportBtn').addEventListener('click', exportProgress);
el('importFile').addEventListener('change', (e) => importProgress(e.target.files[0]));
el('resetBtn').addEventListener('click', resetProgress);
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

switchTab(state.tab);
renderMissableList();
renderAll();
