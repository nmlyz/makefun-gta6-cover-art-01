// Neon Vice Cover Studio — editor UI. Own implementation: state, history,
// panel editing, uploads, export. Rendering lives in cover.js.
import {
  GRADES,
  LAYOUTS,
  SAMPLES,
  defaultState,
  getImage,
  layoutOf,
  layoutPanels,
  loadPanelImages,
  renderCover,
  renderToCanvas,
} from "./cover.js";
import { applyShot, isShotMode, shotParams } from "./shots.js";

const $ = (sel) => document.querySelector(sel);
const canvas = $("#stage");
const ctx = canvas.getContext("2d");

const state = defaultState();
let selected = 0;
let images = new Map();
let history = [];
let future = [];
let drag = null;

const SIZES = [
  { label: "1080 × 1080", w: 1080, h: 1080 },
  { label: "1080 × 1350", w: 1080, h: 1350 },
  { label: "1920 × 1080", w: 1920, h: 1080 },
  { label: "1080 × 1920 Story", w: 1080, h: 1920 },
];

function snapshot() {
  return JSON.stringify(state);
}

function restore(json) {
  const next = JSON.parse(json);
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, next);
  syncControls();
  render();
}

function commit() {
  history.push(snapshot());
  if (history.length > 60) history.shift();
  future = [];
  updateHistoryButtons();
}

function undo() {
  if (!history.length) return;
  future.push(snapshot());
  restore(history.pop());
  updateHistoryButtons();
}

function redo() {
  if (!future.length) return;
  history.push(snapshot());
  restore(future.pop());
  updateHistoryButtons();
}

function updateHistoryButtons() {
  $("#undoBtn").disabled = !history.length;
  $("#redoBtn").disabled = !future.length;
}

function sizeCanvas() {
  if (document.body.classList.contains("shot-cover")) {
    canvas.width = Math.min(window.innerWidth, 1280);
    canvas.height = Math.min(window.innerHeight, 1280);
  } else {
    canvas.width = 900;
    canvas.height = 900;
  }
}

async function render() {
  images = await loadPanelImages(state);
  renderCover(ctx, state, canvas.width, canvas.height, images);
  document.body.dataset.ready = "1";
  drawSelection();
}

function drawSelection() {
  if (document.body.classList.contains("shot-cover")) return;
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  const count = layoutOf(state).panels;
  if (selected >= count) selected = 0;
  const r = rects[selected];
  if (!r) return;
  ctx.save();
  ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
  if (r.rot) ctx.rotate(r.rot);
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#22d3ee";
  ctx.strokeRect(-r.w / 2 - 4, -r.h / 2 - 4, r.w + 8, r.h + 8);
  ctx.restore();
}

function panelAt(cx, cy) {
  const rect = canvas.getBoundingClientRect();
  const x = ((cx - rect.left) / rect.width) * canvas.width;
  const y = ((cy - rect.top) / rect.height) * canvas.height;
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  const count = layoutOf(state).panels;
  for (let i = count - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x - 6 && x <= r.x + r.w + 6 && y >= r.y - 6 && y <= r.y + r.h + 6) return i;
  }
  return -1;
}

// ---- controls ----

function buildLayoutButtons() {
  const wrap = $("#layoutBtns");
  wrap.innerHTML = "";
  LAYOUTS.forEach((l) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (state.layout === l.id ? " active" : "");
    b.textContent = l.name;
    b.onclick = () => {
      commit();
      state.layout = l.id;
      selected = 0;
      syncControls();
      render();
    };
    wrap.appendChild(b);
  });
}

function buildGradeSwatches() {
  const wrap = $("#gradeBtns");
  wrap.innerHTML = "";
  GRADES.forEach((g) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch" + (state.grade === g.id ? " active" : "");
    b.title = g.name;
    b.style.background = `linear-gradient(135deg, ${g.sky[0]} 0%, ${g.sky[1]} 55%, ${g.sky[2]} 100%)`;
    const s = document.createElement("span");
    s.textContent = g.name;
    b.appendChild(s);
    b.onclick = () => {
      commit();
      state.grade = g.id;
      syncControls();
      render();
    };
    wrap.appendChild(b);
  });
}

function buildHeatButtons() {
  const wrap = $("#heatBtns");
  wrap.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "star-btn" + (state.heat >= i ? " on" : "");
    b.textContent = "★";
    b.setAttribute("aria-label", `${i} star${i > 1 ? "s" : ""}`);
    b.onclick = () => {
      commit();
      state.heat = i;
      syncControls();
      render();
    };
    wrap.appendChild(b);
  }
}

function buildPanelSelect() {
  const sel = $("#panelPhoto");
  sel.innerHTML = "";
  SAMPLES.forEach((s) => {
    const o = document.createElement("option");
    o.value = s.src;
    o.textContent = s.label;
    sel.appendChild(o);
  });
  const o = document.createElement("option");
  o.value = "__upload__";
  o.textContent = "Upload your own…";
  sel.appendChild(o);
}

function syncControls() {
  buildLayoutButtons();
  buildGradeSwatches();
  buildHeatButtons();
  $("#titleInput").value = state.title;
  $("#subtitleInput").value = state.subtitle;
  $("#badgeInput").value = state.badge;
  $("#grainToggle").checked = state.grain;
  $("#vignetteToggle").checked = state.vignette;
  $("#halftoneToggle").checked = state.halftone;
  $("#panelLabel").textContent = `Panel ${selected + 1} of ${layoutOf(state).panels}`;
  const p = state.panels[selected];
  const sel = $("#panelPhoto");
  if ([...sel.options].some((o) => o.value === p.src)) sel.value = p.src;
  else sel.value = "__upload__";
  $("#zoomRange").value = String(p.zoom);
  $("#zoomVal").textContent = `${Math.round(p.zoom * 100)}%`;
  $("#xRange").value = String(p.x);
  $("#yRange").value = String(p.y);
}

function setStatus(msg) {
  $("#status").textContent = msg;
}

// ---- exports ----

async function exportSize(size) {
  setStatus(`Rendering ${size.label}…`);
  const out = await renderToCanvas(state, size.w, size.h);
  await new Promise((resolve) => {
    out.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `neon-vice-${size.w}x${size.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve();
    }, "image/png");
  });
  setStatus(`Exported ${size.label} PNG — check your downloads.`);
}

async function exportAll() {
  for (const size of SIZES) {
    await exportSize(size);
    await new Promise((r) => setTimeout(r, 250));
  }
}

function randomize() {
  commit();
  state.layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)].id;
  state.grade = GRADES[Math.floor(Math.random() * GRADES.length)].id;
  state.seed = Math.floor(Math.random() * 100000);
  state.heat = 1 + Math.floor(Math.random() * 5);
  state.panels.forEach((p) => {
    p.src = SAMPLES[Math.floor(Math.random() * SAMPLES.length)].src;
    p.zoom = 1 + Math.random() * 0.4;
    p.x = (Math.random() - 0.5) * 0.4;
    p.y = (Math.random() - 0.5) * 0.4;
  });
  selected = 0;
  syncControls();
  render();
  setStatus("Randomized — undo brings it back.");
}

function resetAll() {
  commit();
  const fresh = defaultState();
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, fresh);
  selected = 0;
  syncControls();
  render();
  setStatus("Reset to the Neon Vice default.");
}

// ---- uploads ----

function useUpload(file) {
  if (!file || !file.type.startsWith("image/")) {
    setStatus("That file is not an image.");
    return;
  }
  const url = URL.createObjectURL(file);
  getImage(url).then(() => {
    commit();
    state.panels[selected].src = url;
    syncControls();
    render();
    setStatus(`Loaded ${file.name} into panel ${selected + 1}.`);
  });
}

// ---- wiring ----

function wire() {
  $("#titleInput").addEventListener("input", (e) => {
    state.title = e.target.value;
    render();
  });
  $("#titleInput").addEventListener("change", commit);
  $("#subtitleInput").addEventListener("input", (e) => {
    state.subtitle = e.target.value;
    render();
  });
  $("#subtitleInput").addEventListener("change", commit);
  $("#badgeInput").addEventListener("input", (e) => {
    state.badge = e.target.value;
    render();
  });
  $("#badgeInput").addEventListener("change", commit);
  $("#grainToggle").addEventListener("change", (e) => {
    commit();
    state.grain = e.target.checked;
    render();
  });
  $("#vignetteToggle").addEventListener("change", (e) => {
    commit();
    state.vignette = e.target.checked;
    render();
  });
  $("#halftoneToggle").addEventListener("change", (e) => {
    commit();
    state.halftone = e.target.checked;
    render();
  });
  $("#panelPhoto").addEventListener("change", (e) => {
    if (e.target.value === "__upload__") {
      $("#fileInput").click();
      return;
    }
    commit();
    state.panels[selected].src = e.target.value;
    render();
  });
  $("#zoomRange").addEventListener("input", (e) => {
    state.panels[selected].zoom = Number(e.target.value);
    $("#zoomVal").textContent = `${Math.round(state.panels[selected].zoom * 100)}%`;
    render();
  });
  $("#zoomRange").addEventListener("change", commit);
  $("#xRange").addEventListener("input", (e) => {
    state.panels[selected].x = Number(e.target.value);
    render();
  });
  $("#xRange").addEventListener("change", commit);
  $("#yRange").addEventListener("input", (e) => {
    state.panels[selected].y = Number(e.target.value);
    render();
  });
  $("#yRange").addEventListener("change", commit);
  $("#fileInput").addEventListener("change", (e) => useUpload(e.target.files[0]));
  $("#uploadBtn").addEventListener("click", () => $("#fileInput").click());
  $("#undoBtn").addEventListener("click", undo);
  $("#redoBtn").addEventListener("click", redo);
  $("#randomBtn").addEventListener("click", randomize);
  $("#resetBtn").addEventListener("click", resetAll);
  $("#exportAllBtn").addEventListener("click", exportAll);
  document.querySelectorAll("[data-export]").forEach((b) => {
    b.addEventListener("click", () => exportSize(SIZES[Number(b.dataset.export)]));
  });

  canvas.addEventListener("pointerdown", (e) => {
    const i = panelAt(e.clientX, e.clientY);
    if (i < 0) return;
    selected = i;
    syncControls();
    render();
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, moved: false };
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const dx = (e.clientX - drag.x) * scaleX;
    const dy = (e.clientY - drag.y) * scaleY;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    const rects = layoutPanels(state.layout, canvas.width, canvas.height);
    const r = rects[selected];
    const p = state.panels[selected];
    p.x = Math.max(-1, Math.min(1, p.x + dx / (r.w * 0.4 || 1)));
    p.y = Math.max(-1, Math.min(1, p.y + dy / (r.h * 0.4 || 1)));
    drag.x = e.clientX;
    drag.y = e.clientY;
    render();
  });
  canvas.addEventListener("pointerup", () => {
    if (drag && drag.moved) commit();
    drag = null;
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const i = panelAt(e.clientX, e.clientY);
    if (i < 0) return;
    selected = i;
    const p = state.panels[selected];
    p.zoom = Math.max(1, Math.min(3, p.zoom * (1 - e.deltaY * 0.001)));
    syncControls();
    render();
  }, { passive: false });

  const stage = $("#stageWrap");
  ["dragenter", "dragover"].forEach((ev) =>
    stage.addEventListener(ev, (e) => {
      e.preventDefault();
      stage.classList.add("dropping");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    stage.addEventListener(ev, (e) => {
      e.preventDefault();
      stage.classList.remove("dropping");
    })
  );
  stage.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    useUpload(file);
  });
  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
  });
}

// ---- boot ----

buildPanelSelect();
if (isShotMode()) {
  const params = shotParams();
  const kind = applyShot(state, params);
  if (kind === "cover") document.body.classList.add("shot-cover");
  document.title = `Neon Vice — ${params.shot}`;
}
sizeCanvas();
wire();
syncControls();
updateHistoryButtons();
render();
