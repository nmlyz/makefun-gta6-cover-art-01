// Neon Vice Cover Studio — editor UI.
// Owns the state, the sidebar controls, panel drag/zoom, photo uploads,
// undo/redo, randomize and PNG export. All drawing lives in cover.js.
import { SAMPLE_PHOTOS, GRADES, LAYOUTS, SIZES, defaultState, renderCover, layoutGeometry } from './cover.js';
import { readShotParams } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('coverCanvas');
const ctx = canvas.getContext('2d');

const TITLES = ['VICE CITY', 'SUNSET STRIP', 'NEON SHORE', 'NIGHT SHIFT', 'PIER PRESSURE', 'PALM HEAT'];
const SUBTITLES = ['Neon Nights', 'Nine Lives in Neon', 'Chasing the Sun', 'Vice City Nights', 'Golden Hour Club'];

let state = defaultState();
let photos = [];          // { id, src, img, name }
let selected = 0;
let undoStack = [];
let redoStack = [];
let shot = null;
let previewScale = 1;    // backing px per css px on the preview canvas

function snapshot() {
  return JSON.stringify(state);
}
function commit() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  syncUndoButtons();
}
function restore(json) {
  state = JSON.parse(json);
  syncAll();
  draw();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncUndoButtons();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncUndoButtons();
}
function syncUndoButtons() {
  $('btnUndo').disabled = !undoStack.length;
  $('btnRedo').disabled = !redoStack.length;
}

// ---------- photos ----------
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadSamples(order) {
  const list = order
    ? [...SAMPLE_PHOTOS].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    : SAMPLE_PHOTOS;
  photos = [];
  for (const s of list) {
    const img = await loadImage(s.src);
    if (img) photos.push({ id: s.id, src: s.src, img, name: s.label });
  }
  buildTray();
}

function photoImages() {
  return photos.map((p) => p.img);
}

function buildTray() {
  const tray = $('photoTray');
  tray.innerHTML = '';
  photos.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'thumb';
    b.title = p.name + ' — click to put on the selected panel';
    const im = document.createElement('img');
    im.src = p.src;
    im.alt = p.name;
    b.appendChild(im);
    b.addEventListener('click', () => {
      commit();
      const panel = state.panels[selected] || state.panels[0];
      panel.photo = i;
      panel.zoom = 1;
      panel.ox = 0.5;
      panel.oy = 0.5;
      draw();
    });
    tray.appendChild(b);
  });
}

async function addUploads(files) {
  let added = false;
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    const url = await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(f);
    });
    const img = await loadImage(url);
    if (!img) continue;
    photos.push({ id: 'up' + photos.length, src: url, img, name: f.name });
    added = true;
  }
  if (added) {
    buildTray();
    draw();
  }
}

// ---------- drawing ----------
function exportSize() {
  return SIZES.find((s) => s.id === state.sizeId) || SIZES[1];
}

function sizePreview() {
  if (shot && shot.cover) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    previewScale = 1;
    return;
  }
  const size = exportSize();
  const stage = $('stage');
  const availW = Math.max(320, stage.clientWidth - 28);
  const availH = Math.max(320, stage.clientHeight - 28);
  const fit = Math.min(availW / size.w, availH / size.h);
  const cssW = Math.round(size.w * fit);
  const cssH = Math.round(size.h * fit);
  const backing = Math.min(1000, Math.max(size.w, size.h));
  const s = backing / Math.max(size.w, size.h);
  canvas.width = Math.round(size.w * s);
  canvas.height = Math.round(size.h * s);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  previewScale = canvas.width / cssW;
}

function draw() {
  sizePreview();
  renderCover(ctx, canvas.width, canvas.height, state, photoImages(), {
    selected,
    forExport: !!(shot && shot.cover),
  });
  updateStatus();
}

function updateStatus() {
  const size = exportSize();
  const layout = LAYOUTS[state.layout] || {};
  const grade = GRADES[state.grade] || {};
  $('statusLine').textContent =
    `${layout.label || state.layout} · ${grade.label || state.grade} grade · ${size.label}` +
    ` · Panel ${selected + 1} of ${layout.panels || state.panels.length} selected`;
}

// ---------- controls ----------
function chipRow(el, items, current, onPick) {
  el.innerHTML = '';
  items.forEach(([id, label]) => {
    const b = document.createElement('button');
    b.className = 'chip' + (id === current ? ' active' : '');
    b.textContent = label;
    b.addEventListener('click', () => {
      commit();
      onPick(id);
      chipRow(el, items, id, onPick);
      draw();
    });
    el.appendChild(b);
  });
}

function buildControls() {
  chipRow($('layoutRow'), Object.entries(LAYOUTS).map(([k, v]) => [k, v.label]), state.layout,
    (id) => { state.layout = id; selected = 0; syncPanelControls(); });
  chipRow($('gradeRow'), Object.entries(GRADES).map(([k, v]) => [k, v.label]), state.grade,
    (id) => { state.grade = id; });
  chipRow($('sizeRow'), SIZES.map((s) => [s.id, s.label]), state.sizeId,
    (id) => { state.sizeId = id; });

  const heatRow = $('heatRow');
  heatRow.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement('button');
    b.className = 'heat-btn';
    b.textContent = '★'.repeat(i);
    b.title = i + ' star' + (i > 1 ? 's' : '') + ' of heat';
    b.addEventListener('click', () => {
      commit();
      state.heat = i;
      syncHeat();
      draw();
    });
    heatRow.appendChild(b);
  }
  syncHeat();
}

function syncHeat() {
  [...$('heatRow').children].forEach((b, i) => {
    b.classList.toggle('active', i + 1 === state.heat);
  });
}

function bindToggle(id, key) {
  const el = $(id);
  el.checked = !!state[key];
  el.addEventListener('change', () => {
    commit();
    state[key] = el.checked;
    draw();
  });
}

function bindText(id, key, transform) {
  const el = $(id);
  el.value = state[key];
  el.addEventListener('input', () => {
    state[key] = transform ? transform(el.value) : el.value;
    draw();
  });
  el.addEventListener('change', () => commit());
}

function syncPanelControls() {
  const p = state.panels[selected] || state.panels[0];
  $('zoomRange').value = p ? p.zoom : 1;
  $('selInfo').textContent = `Panel ${selected + 1} of ${state.panels.length} selected`;
}

function syncAll() {
  $('titleInput').value = state.title;
  $('subInput').value = state.subtitle;
  $('badgeInput').value = state.badge;
  ['chkHalftone', 'chkGrain', 'chkVignette', 'chkSkyline', 'chkPalms'].forEach((id) => {
    const key = { chkHalftone: 'halftone', chkGrain: 'grain', chkVignette: 'vignette', chkSkyline: 'skyline', chkPalms: 'palms' }[id];
    $(id).checked = !!state[key];
  });
  syncHeat();
  buildControls();
  syncPanelControls();
}

// ---------- export ----------
function renderOffscreen(size) {
  const c = document.createElement('canvas');
  c.width = size.w;
  c.height = size.h;
  renderCover(c.getContext('2d'), size.w, size.h, state, photoImages(), { forExport: true });
  return c;
}

function downloadCanvas(c, name) {
  return new Promise((resolve) => {
    c.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      resolve();
    }, 'image/png');
  });
}

async function exportPNG(size) {
  const c = renderOffscreen(size);
  await downloadCanvas(c, `neon-vice-${size.w}x${size.h}.png`);
}

async function exportAll() {
  const btn = $('btnExportAll');
  btn.disabled = true;
  btn.textContent = 'Exporting…';
  for (const s of SIZES) {
    await exportPNG(s);
    await new Promise((r) => setTimeout(r, 250));
  }
  btn.disabled = false;
  btn.textContent = 'Export all 4 sizes';
}

// ---------- randomize / reset ----------
function randomize() {
  commit();
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.layout = pick(Object.keys(LAYOUTS));
  state.grade = pick(Object.keys(GRADES));
  state.title = pick(TITLES);
  state.subtitle = pick(SUBTITLES);
  state.heat = 3 + Math.floor(Math.random() * 3);
  const count = (LAYOUTS[state.layout] || {}).panels || 4;
  while (state.panels.length < count) state.panels.push({ photo: 0, zoom: 1, ox: 0.5, oy: 0.5 });
  for (let i = 0; i < count; i++) {
    state.panels[i] = {
      photo: Math.floor(Math.random() * photos.length),
      zoom: 1 + Math.random() * 0.5,
      ox: 0.35 + Math.random() * 0.3,
      oy: 0.35 + Math.random() * 0.3,
    };
  }
  selected = 0;
  syncAll();
  draw();
}

function resetAll() {
  commit();
  const keepPanels = state.panels;
  state = defaultState();
  state.panels = keepPanels.map((p, i) => ({ ...(defaultState().panels[i] || p) }));
  selected = 0;
  syncAll();
  draw();
}

// ---------- panel pointer interaction ----------
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}

function hitPanel(pt) {
  const geo = layoutGeometry(state.layout, canvas.width, canvas.height);
  for (let i = geo.panels.length - 1; i >= 0; i--) {
    const p = geo.panels[i];
    if (pt.x >= p.x && pt.x <= p.x + p.w && pt.y >= p.y && pt.y <= p.y + p.h) return i;
  }
  return -1;
}

function bindCanvas() {
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const pt = canvasPoint(e);
    const i = hitPanel(pt);
    if (i < 0) return;
    selected = i;
    syncPanelControls();
    const p = state.panels[i];
    drag = { lastX: pt.x, lastY: pt.y, moved: false, before: snapshot() };
    canvas.setPointerCapture(e.pointerId);
    draw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const pt = canvasPoint(e);
    const dx = pt.x - drag.lastX;
    const dy = pt.y - drag.lastY;
    drag.lastX = pt.x;
    drag.lastY = pt.y;
    if (Math.abs(dx) + Math.abs(dy) > 0.5) drag.moved = true;
    const geo = layoutGeometry(state.layout, canvas.width, canvas.height);
    const panel = geo.panels[selected];
    const p = state.panels[selected];
    const img = photos[p.photo] && photos[p.photo].img;
    if (!panel || !p || !img) return;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(panel.w / iw, panel.h / ih) * p.zoom;
    p.ox = Math.min(1, Math.max(0, p.ox - dx / (iw * scale)));
    p.oy = Math.min(1, Math.max(0, p.oy - dy / (ih * scale)));
    draw();
  });
  canvas.addEventListener('pointerup', () => {
    if (drag && drag.moved) {
      undoStack.push(drag.before);
      if (undoStack.length > 60) undoStack.shift();
      redoStack = [];
      syncUndoButtons();
    }
    drag = null;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const i = hitPanel(canvasPoint(e));
    if (i < 0) return;
    commit();
    selected = i;
    const p = state.panels[i];
    p.zoom = Math.min(3, Math.max(1, p.zoom * (e.deltaY < 0 ? 1.12 : 0.89)));
    syncPanelControls();
    draw();
  }, { passive: false });

  // Drag & drop photos onto the stage (onto a panel to fill just it).
  const stage = $('stage');
  stage.addEventListener('dragover', (e) => e.preventDefault());
  stage.addEventListener('drop', async (e) => {
    e.preventDefault();
    const before = photos.length;
    await addUploads(e.dataTransfer.files);
    if (photos.length > before) {
      const i = hitPanel(canvasPoint(e));
      commit();
      const target = i >= 0 ? i : selected;
      state.panels[target].photo = photos.length - 1;
      draw();
    }
  });
}

// ---------- wire up ----------
function bindButtons() {
  $('btnUndo').addEventListener('click', undo);
  $('btnRedo').addEventListener('click', redo);
  $('btnRandom').addEventListener('click', randomize);
  $('btnReset').addEventListener('click', resetAll);
  $('btnExport').addEventListener('click', () => exportPNG(exportSize()));
  $('btnExportAll').addEventListener('click', exportAll);
  $('btnAddPhotos').addEventListener('click', () => $('photoInput').click());
  $('photoInput').addEventListener('change', (e) => {
    addUploads(e.target.files);
    e.target.value = '';
  });
  $('btnFillAll').addEventListener('click', () => {
    if (!photos.length) return;
    commit();
    const n = (LAYOUTS[state.layout] || {}).panels || 4;
    for (let i = 0; i < n; i++) {
      state.panels[i] = { photo: i % photos.length, zoom: 1, ox: 0.5, oy: 0.45 };
    }
    draw();
  });
  $('btnApplySelected').addEventListener('click', () => {
    if (!photos.length) return;
    commit();
    const n = (LAYOUTS[state.layout] || {}).panels || 4;
    for (let i = 0; i < n; i++) state.panels[i].photo = selected % photos.length;
    draw();
  });
  $('zoomRange').addEventListener('input', (e) => {
    const p = state.panels[selected];
    if (!p) return;
    p.zoom = Number(e.target.value);
    draw();
  });
  $('zoomRange').addEventListener('change', () => commit());
  $('btnCropReset').addEventListener('click', () => {
    commit();
    const p = state.panels[selected];
    if (p) { p.zoom = 1; p.ox = 0.5; p.oy = 0.5; }
    syncPanelControls();
    draw();
  });
  $('btnClearPanel').addEventListener('click', () => {
    commit();
    state.panels[selected] = { photo: -1, zoom: 1, ox: 0.5, oy: 0.5 };
    draw();
  });
  window.addEventListener('resize', draw);
}

async function init() {
  shot = readShotParams();
  if (shot) {
    Object.assign(state, shot.preset);
    if (shot.cover) document.body.classList.add('shot-cover');
    else document.body.classList.add('shot-editor');
  }
  buildControls();
  bindButtons();
  bindCanvas();
  bindToggle('chkHalftone', 'halftone');
  bindToggle('chkGrain', 'grain');
  bindToggle('chkVignette', 'vignette');
  bindToggle('chkSkyline', 'skyline');
  bindToggle('chkPalms', 'palms');
  bindText('titleInput', 'title', (v) => v.toUpperCase());
  bindText('subInput', 'subtitle');
  bindText('badgeInput', 'badge', (v) => v.toUpperCase());
  syncAll();
  await loadSamples(shot ? shot.photoOrder : null);
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('40px Pacifico'),
    ]);
  } catch (e) { /* fall back to system fonts */ }
  draw();
  window.__shotReady = true;
}

init();
