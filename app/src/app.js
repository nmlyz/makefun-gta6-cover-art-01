// Vice Cover Maker — editor UI: state, history, photo pool, drag/zoom,
// export, and the fixed ?shot= scenes used for screenshots.
import { LAYOUTS, GRADES, SIZES, drawCover, panelAt, panelCount } from "./cover.js";

const $ = (id) => document.getElementById(id);
const canvas = $("coverCanvas");
const ctx = canvas.getContext("2d");
const stage = $("stage");

const SAMPLES = [
  { id: "sample-woman", src: "samples/woman-car.jpg", name: "Woman by the car" },
  { id: "sample-man", src: "samples/man-rooftop.jpg", name: "Man on the rooftop" },
  { id: "sample-friends", src: "samples/friends-neon.jpg", name: "Friends in neon" },
];

const photos = new Map(); // id -> { img, name }
let pickedSample = null;
let selected = 0;
let undoStack = [];
let redoStack = [];
let drag = null;

function blankPanels(n) {
  return Array.from({ length: n }, () => ({ photoId: null, zoom: 1, ox: 0, oy: 0 }));
}

function freshState() {
  return {
    layout: "hero3",
    grade: "sunset",
    title: "VICE CITY",
    subtitle: "Neon Nights",
    halftone: true,
    grain: true,
    vignette: true,
    size: "portrait",
    panels: blankPanels(4),
  };
}

let state = freshState();

function snapshot() {
  return JSON.stringify(state);
}
function restore(json) {
  state = JSON.parse(json);
  syncControls();
  render();
}
function commit() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  updateUndoButtons();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  updateUndoButtons();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  updateUndoButtons();
}
function updateUndoButtons() {
  $("undoBtn").disabled = !undoStack.length;
  $("redoBtn").disabled = !redoStack.length;
}

function panelImages() {
  return state.panels.map((p) => ({
    photo: p.photoId ? photos.get(p.photoId)?.img ?? null : null,
    zoom: p.zoom, ox: p.ox, oy: p.oy,
  }));
}

function render() {
  const size = SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(ctx, size.w, size.h, { ...state, panels: panelImages() });
  const note = `${LAYOUTS[state.layout].label} · ${GRADES[state.grade].label} grade · ${size.label}`;
  $("stageNote").textContent = note;
  $("selectedLabel").textContent =
    `Panel ${selected + 1} of ${panelCount(state.layout)} selected`;
  const sel = state.panels[selected];
  if (sel) $("zoomInput").value = String(sel.zoom);
}

function syncControls() {
  document.querySelectorAll("#layoutChoices button").forEach((b) =>
    b.classList.toggle("active", b.dataset.value === state.layout));
  document.querySelectorAll("#gradeChoices button").forEach((b) =>
    b.classList.toggle("active", b.dataset.value === state.grade));
  document.querySelectorAll("#sizeChoices button").forEach((b) =>
    b.classList.toggle("active", b.dataset.value === state.size));
  $("titleInput").value = state.title;
  $("subtitleInput").value = state.subtitle;
  $("halftoneInput").checked = state.halftone;
  $("grainInput").checked = state.grain;
  $("vignetteInput").checked = state.vignette;
}

function buildChoices(el, entries, current, onPick) {
  const box = $(el);
  box.innerHTML = "";
  for (const [value, info] of Object.entries(entries)) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = info.label;
    b.dataset.value = value;
    if (value === current) b.classList.add("active");
    b.addEventListener("click", () => {
      commit();
      onPick(value);
      syncControls();
      render();
    });
    box.appendChild(b);
  }
}

function setLayout(layout) {
  const old = state.panels;
  state.layout = layout;
  const n = panelCount(layout);
  const next = blankPanels(n);
  for (let i = 0; i < Math.min(n, old.length); i++) next[i] = old[i];
  state.panels = next;
  selected = 0;
}

async function loadPhoto(id, src, name) {
  if (photos.has(id)) return id;
  const img = new Image();
  img.decoding = "async";
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error("could not load " + src));
    img.src = src;
  });
  photos.set(id, { img, name });
  return id;
}

async function loadSamples() {
  for (const s of SAMPLES) {
    try { await loadPhoto(s.id, s.src, s.name); } catch (_) { /* sample missing */ }
  }
  const box = $("samples");
  box.innerHTML = "";
  for (const s of SAMPLES) {
    const rec = photos.get(s.id);
    if (!rec) continue;
    const b = document.createElement("button");
    b.type = "button";
    b.title = s.name;
    const img = document.createElement("img");
    img.src = s.src;
    img.alt = s.name;
    b.appendChild(img);
    b.addEventListener("click", () => {
      pickedSample = s.id;
      box.querySelectorAll("button").forEach((x) => x.classList.remove("picked"));
      b.classList.add("picked");
      commit();
      state.panels[selected].photoId = s.id;
      state.panels[selected].zoom = 1;
      state.panels[selected].ox = 0;
      state.panels[selected].oy = 0;
      render();
    });
    box.appendChild(b);
  }
}

function applyPhotoToPanel(id, index) {
  commit();
  const p = state.panels[index];
  p.photoId = id;
  p.zoom = 1; p.ox = 0; p.oy = 0;
  render();
}

async function addFiles(files) {
  let firstId = null;
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const id = "up-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const url = URL.createObjectURL(file);
    try {
      await loadPhoto(id, url, file.name);
      firstId = firstId ?? id;
    } catch (_) { /* unreadable file */ }
  }
  if (firstId) applyPhotoToPanel(firstId, selected);
  return firstId;
}

function exportPng() {
  const size = SIZES[state.size];
  const off = document.createElement("canvas");
  off.width = size.w;
  off.height = size.h;
  drawCover(off.getContext("2d"), size.w, size.h, { ...state, panels: panelImages() });
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${state.size}-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, "image/png");
}

// ---- pointer interaction on the preview ----
function canvasPoint(ev) {
  const r = canvas.getBoundingClientRect();
  const x = (ev.clientX - r.left) / r.width * canvas.width;
  const y = (ev.clientY - r.top) / r.height * canvas.height;
  return { x, y };
}
canvas.addEventListener("pointerdown", (ev) => {
  const { x, y } = canvasPoint(ev);
  const hit = panelAt(state.layout, canvas.width, canvas.height, x, y);
  if (hit < 0) return;
  selected = hit;
  const p = state.panels[hit];
  drag = { startX: x, startY: y, ox: p.ox, oy: p.oy, moved: false, before: snapshot() };
  canvas.setPointerCapture(ev.pointerId);
  render();
});
canvas.addEventListener("pointermove", (ev) => {
  if (!drag) return;
  const { x, y } = canvasPoint(ev);
  const dx = (x - drag.startX) / canvas.width;
  const dy = (y - drag.startY) / canvas.height;
  if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
  const p = state.panels[selected];
  p.ox = drag.ox + dx;
  p.oy = drag.oy + dy;
  render();
});
canvas.addEventListener("pointerup", () => {
  if (drag?.moved && drag.before) {
    undoStack.push(drag.before);
    if (undoStack.length > 60) undoStack.shift();
    redoStack = [];
    updateUndoButtons();
  }
  drag = null;
});

canvas.addEventListener("wheel", (ev) => {
  ev.preventDefault();
  const p = state.panels[selected];
  if (!p) return;
  const next = Math.min(2.5, Math.max(1, p.zoom * (ev.deltaY < 0 ? 1.08 : 0.93)));
  if (Math.abs(next - p.zoom) > 0.001) {
    p.zoom = next;
    render();
  }
}, { passive: false });

stage.addEventListener("dragover", (ev) => {
  ev.preventDefault();
  stage.classList.add("dragging");
});
stage.addEventListener("dragleave", () => stage.classList.remove("dragging"));
stage.addEventListener("drop", async (ev) => {
  ev.preventDefault();
  stage.classList.remove("dragging");
  const { x, y } = canvasPoint(ev);
  const hit = panelAt(state.layout, canvas.width, canvas.height, x, y);
  if (hit >= 0) selected = hit;
  await addFiles(ev.dataTransfer.files);
});

// ---- wire up controls ----
buildChoices("layoutChoices", LAYOUTS, state.layout, setLayout);
buildChoices("gradeChoices", GRADES, state.grade, (v) => { state.grade = v; });
buildChoices("sizeChoices", SIZES, state.size, (v) => { state.size = v; });

$("titleInput").addEventListener("input", (ev) => { state.title = ev.target.value; render(); });
$("titleInput").addEventListener("change", () => commit());
$("subtitleInput").addEventListener("input", (ev) => { state.subtitle = ev.target.value; render(); });
$("subtitleInput").addEventListener("change", () => commit());
$("halftoneInput").addEventListener("change", (ev) => { commit(); state.halftone = ev.target.checked; render(); });
$("grainInput").addEventListener("change", (ev) => { commit(); state.grain = ev.target.checked; render(); });
$("vignetteInput").addEventListener("change", (ev) => { commit(); state.vignette = ev.target.checked; render(); });
$("zoomInput").addEventListener("input", (ev) => {
  const p = state.panels[selected];
  if (p) { p.zoom = parseFloat(ev.target.value); render(); }
});
$("zoomInput").addEventListener("change", () => commit());
$("resetCropBtn").addEventListener("click", () => {
  commit();
  const p = state.panels[selected];
  p.zoom = 1; p.ox = 0; p.oy = 0;
  render();
});
$("clearPanelBtn").addEventListener("click", () => {
  commit();
  state.panels[selected].photoId = null;
  render();
});
$("fillAllBtn").addEventListener("click", () => {
  const id = pickedSample || "sample-woman";
  if (!photos.has(id)) return;
  commit();
  state.panels.forEach((p) => { p.photoId = id; p.zoom = 1; p.ox = 0; p.oy = 0; });
  render();
});
$("applySelectedBtn").addEventListener("click", () => {
  const id = pickedSample || "sample-woman";
  if (photos.has(id)) applyPhotoToPanel(id, selected);
});
$("fileInput").addEventListener("change", async (ev) => {
  await addFiles(ev.target.files);
  ev.target.value = "";
});
$("undoBtn").addEventListener("click", undo);
$("redoBtn").addEventListener("click", redo);
$("exportBtn").addEventListener("click", exportPng);
document.addEventListener("keydown", (ev) => {
  if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "z") {
    ev.preventDefault();
    if (ev.shiftKey) redo(); else undo();
  }
});

// ---- fixed screenshot scenes (?shot=...) ----
const params = new URLSearchParams(location.search);
const shot = params.get("shot");

async function applyShotScene() {
  await loadSamples();
  const put = (index, id) => {
    const p = state.panels[index];
    if (p) { p.photoId = id; p.zoom = 1; p.ox = 0; p.oy = 0; }
  };
  if (shot === "cover") {
    document.body.classList.add("shot-cover");
    state.layout = "hero3";
    state.grade = "sunset";
    state.size = "portrait";
    state.title = "VICE CITY";
    state.subtitle = "Neon Nights";
    state.panels = blankPanels(4);
    put(0, "sample-woman"); put(1, "sample-man"); put(2, "sample-friends"); put(3, "sample-woman");
  } else if (shot === "cover2") {
    document.body.classList.add("shot-cover");
    state.layout = "collage";
    state.grade = "neon";
    state.size = "square";
    state.title = "SUNSET STRIP";
    state.subtitle = "Vice City Nights";
    state.panels = blankPanels(4);
    put(0, "sample-friends"); put(1, "sample-woman"); put(2, "sample-man"); put(3, "sample-friends");
  } else if (shot === "editor") {
    state.layout = "hero3";
    state.grade = "sunset";
    state.size = "portrait";
    state.title = "VICE CITY";
    state.subtitle = "Neon Nights";
    state.panels = blankPanels(4);
    put(0, "sample-woman"); put(1, "sample-man"); put(2, "sample-friends"); put(3, "sample-woman");
  } else if (shot === "editor2") {
    state.layout = "grid9";
    state.grade = "vice";
    state.size = "square";
    state.title = "VICE CITY";
    state.subtitle = "Nine Lives in Neon";
    state.panels = blankPanels(9);
    const ids = ["sample-woman", "sample-man", "sample-friends"];
    state.panels.forEach((p, i) => { p.photoId = ids[i % 3]; });
  } else {
    // Plain editor: start with the samples spread across the hero layout.
    state.panels = blankPanels(4);
    put(0, "sample-woman"); put(1, "sample-man"); put(2, "sample-friends"); put(3, "sample-woman");
  }
  syncControls();
  render();
}

async function boot() {
  try {
    await document.fonts.load('16px Anton');
    await document.fonts.load('16px Pacifico');
    await document.fonts.ready;
  } catch (_) { /* fall back to system fonts */ }
  await applyShotScene();
  // Draw once more after fonts settle so the title uses Anton/Pacifico.
  render();
  await new Promise((r) => setTimeout(r, 300));
  render();
  document.body.dataset.ready = "yes";
}

boot();
