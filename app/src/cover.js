// Neon Vice Cover Studio — canvas render engine (vanilla, no libraries).
// Lettering uses system font stacks only: heavy sans for the title, a
// cursive stack for the neon script subtitle. No vendored fonts.

export const GRADES = [
  { id: "sunset", name: "Sunset", sky: ["#1b0f3b", "#ff6b35", "#f7b733"], sun: "#ffd166", tint: "#ff7e5f", tintAlpha: 0.16, title: ["#fff3b0", "#ff9e00", "#ff2e63"], accent: "#ff2e63", script: "#ff9ecf", glow: "#ff2e63" },
  { id: "neon", name: "Neon Night", sky: ["#050510", "#1a0b2e", "#ff2e88"], sun: "#ff2e88", tint: "#7b2ff7", tintAlpha: 0.22, title: ["#7df9ff", "#b967ff", "#ff2e88"], accent: "#22d3ee", script: "#7df9ff", glow: "#22d3ee" },
  { id: "vice", name: "Vice Pink", sky: ["#3b0f4f", "#ff5e8a", "#ffb3c7"], sun: "#ffe3ec", tint: "#ff5e8a", tintAlpha: 0.18, title: ["#ffffff", "#ff8fb3", "#d6336c"], accent: "#ff5e8a", script: "#ffd6e8", glow: "#ff2e88" },
  { id: "teal", name: "Teal Dusk", sky: ["#062a33", "#0f766e", "#f59e0b"], sun: "#fde68a", tint: "#14b8a6", tintAlpha: 0.18, title: ["#ecfeff", "#5eead4", "#f59e0b"], accent: "#2dd4bf", script: "#a5f3fc", glow: "#14b8a6" },
  { id: "noir", name: "Mono Noir", sky: ["#0a0a0a", "#3f3f46", "#a1a1aa"], sun: "#fafafa", tint: "#000000", tintAlpha: 0.22, title: ["#ffffff", "#d4d4d8", "#71717a"], accent: "#e4e4e7", script: "#ffffff", glow: "#a1a1aa" },
  { id: "golden", name: "Golden Hour", sky: ["#1f2937", "#f59e0b", "#fde68a"], sun: "#fff7cc", tint: "#f59e0b", tintAlpha: 0.16, title: ["#fffbeb", "#fbbf24", "#ea580c"], accent: "#f59e0b", script: "#fef3c7", glow: "#f59e0b" },
  { id: "magenta", name: "Magenta Haze", sky: ["#2a0a2e", "#c026d3", "#f0abfc"], sun: "#fdf4ff", tint: "#d946ef", tintAlpha: 0.2, title: ["#fdf4ff", "#e879f9", "#a21caf"], accent: "#e879f9", script: "#f5d0fe", glow: "#d946ef" },
];

export const LAYOUTS = [
  { id: "nine", name: "9-Panel Grid", panels: 9 },
  { id: "hero3", name: "Hero + 3", panels: 4 },
  { id: "four", name: "4-Panel", panels: 4 },
  { id: "tilted", name: "Tilted Snaps", panels: 3 },
  { id: "full", name: "Full-Bleed", panels: 1 },
  { id: "six", name: "6-Panel", panels: 6 },
  { id: "duo", name: "Duo Split", panels: 3 },
];

export const SAMPLES = [
  { id: "boulevard", label: "Boulevard", src: "samples/boulevard.jpg" },
  { id: "pier", label: "Pier", src: "samples/pier.jpg" },
];

export function defaultState() {
  return {
    layout: "nine",
    grade: "sunset",
    title: "NEON VICE",
    subtitle: "Vice City Nights",
    badge: "EST. 2026",
    heat: 4,
    grain: true,
    vignette: true,
    halftone: true,
    seed: 42,
    panels: Array.from({ length: 9 }, (_, i) => ({
      src: SAMPLES[i % 2].src,
      zoom: 1,
      x: 0,
      y: 0,
    })),
  };
}

export function gradeOf(state) {
  return GRADES.find((g) => g.id === state.grade) || GRADES[0];
}

export function layoutOf(state) {
  return LAYOUTS.find((l) => l.id === state.layout) || LAYOUTS[0];
}

// Deterministic PRNG so screenshot scenes render identically every run.
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Panel rects in pixels. Panel area is the top 76% of the canvas; the
// bottom 24% is the title block. Returns [{x,y,w,h,rot}] in draw order.
export function layoutPanels(layoutId, W, H) {
  const areaH = H * 0.76;
  const g = Math.max(6, W * 0.008); // gap between panels
  const P = (x, y, w, h, rot = 0) => ({ x, y, w, h, rot });
  switch (layoutId) {
    case "hero3": {
      const bw = (W - g * 4) / 3;
      const bh = areaH * 0.3;
      return [
        P(g, g, W - g * 2, areaH * 0.62),
        P(g, areaH * 0.62 + g * 2, bw, bh),
        P(g * 2 + bw, areaH * 0.62 + g * 2, bw, bh),
        P(g * 3 + bw * 2, areaH * 0.62 + g * 2, bw, bh),
      ];
    }
    case "four": {
      const w = (W - g * 3) / 2;
      const h = (areaH - g * 3) / 2;
      return [P(g, g, w, h), P(g * 2 + w, g, w, h), P(g, g * 2 + h, w, h), P(g * 2 + w, g * 2 + h, w, h)];
    }
    case "tilted": {
      const w = W * 0.44;
      const h = areaH * 0.72;
      return [
        P(W * 0.03, areaH * 0.06, w, h, -0.1),
        P(W * 0.29, areaH * 0.02, w, h, 0.05),
        P(W * 0.55, areaH * 0.08, w, h, -0.04),
      ];
    }
    case "full":
      return [P(0, 0, W, H)];
    case "six": {
      const w = (W - g * 4) / 3;
      const h = (areaH - g * 3) / 2;
      const out = [];
      for (let r = 0; r < 2; r++)
        for (let c = 0; c < 3; c++)
          out.push(P(g + c * (w + g), g + r * (h + g), w, h));
      return out;
    }
    case "duo": {
      const lw = W * 0.58;
      const rw = W - lw - g * 3;
      const hh = (areaH - g * 3) / 2;
      return [P(g, g, lw, areaH - g * 2), P(lw + g * 2, g, rw, hh), P(lw + g * 2, g * 2 + hh, rw, hh)];
    }
    case "nine":
    default: {
      const w = (W - g * 4) / 3;
      const h = (areaH - g * 4) / 3;
      const out = [];
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++)
          out.push(P(g + c * (w + g), g + r * (h + g), w, h));
      return out;
    }
  }
}

const imageCache = new Map();
export function getImage(src) {
  if (!imageCache.has(src)) {
    imageCache.set(
      src,
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      })
    );
  }
  return imageCache.get(src);
}

export async function loadPanelImages(state) {
  const srcs = [...new Set(state.panels.map((p) => p.src))];
  const loaded = await Promise.all(srcs.map((s) => getImage(s)));
  const map = new Map();
  srcs.forEach((s, i) => map.set(s, loaded[i]));
  return map;
}

function drawSky(ctx, grade, W, H, rng) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // Sun disc with glow, upper third.
  const sx = W * 0.68;
  const sy = H * 0.3;
  const sr = Math.min(W, H) * 0.16;
  const glow = ctx.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 2.6);
  glow.addColorStop(0, grade.sun);
  glow.addColorStop(0.35, grade.sun + "55");
  glow.addColorStop(1, grade.sun + "00");
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = glow;
  ctx.fillRect(sx - sr * 2.6, sy - sr * 2.6, sr * 5.2, sr * 5.2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = grade.sun;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();
  // Retro sun slats.
  ctx.fillStyle = grade.sky[1];
  for (let i = 0; i < 4; i++) {
    const y = sy + sr * (0.15 + i * 0.22);
    ctx.fillRect(sx - sr, y, sr * 2, sr * 0.045);
  }
  // Skyline silhouette along the horizon.
  const horizon = H * 0.62;
  ctx.fillStyle = "#0d0618";
  let x = -W * 0.02;
  while (x < W * 1.02) {
    const bw = W * (0.03 + rng() * 0.05);
    const bh = H * (0.05 + rng() * 0.13);
    const bottom = H * 0.76; // skyline stops where the title band starts
    ctx.fillRect(x, horizon - bh, bw, bottom - (horizon - bh));
    if (rng() > 0.6) {
      ctx.fillRect(x + bw * 0.3, horizon - bh - H * 0.03, bw * 0.4, H * 0.03);
    }
    x += bw + W * 0.004;
  }
  // Lit windows.
  ctx.fillStyle = grade.accent;
  for (let i = 0; i < 90; i++) {
    const wx = rng() * W;
    const wy = horizon - rng() * H * 0.16;
    ctx.globalAlpha = 0.25 + rng() * 0.6;
    ctx.fillRect(wx, wy, Math.max(2, W * 0.004), Math.max(2, H * 0.005));
  }
  ctx.globalAlpha = 1;
  // Palm silhouettes at the edges.
  drawPalm(ctx, W * 0.06, H * 0.66, H * 0.16, -0.25);
  drawPalm(ctx, W * 0.94, H * 0.68, H * 0.13, 0.3);
}

function drawPalm(ctx, x, y, s, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.strokeStyle = "#0d0618";
  ctx.fillStyle = "#0d0618";
  ctx.lineWidth = Math.max(3, s * 0.07);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.12, -s * 0.55, s * 0.05, -s);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.08 + i * 0.13);
    const len = s * (0.55 + (i % 3) * 0.12);
    ctx.beginPath();
    ctx.moveTo(s * 0.05, -s);
    ctx.quadraticCurveTo(
      s * 0.05 + Math.cos(a) * len * 0.6,
      -s + Math.sin(a) * len * 0.6 - s * 0.12,
      s * 0.05 + Math.cos(a) * len,
      -s + Math.sin(a) * len + s * 0.18
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawPhoto(ctx, img, rect, panel, grade) {
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  if (rect.rot) ctx.rotate(rect.rot);
  ctx.translate(-rect.w / 2, -rect.h / 2);
  ctx.beginPath();
  ctx.rect(0, 0, rect.w, rect.h);
  ctx.clip();
  if (img) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max(rect.w / iw, rect.h / ih) * (panel.zoom || 1);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (rect.w - dw) / 2 + (panel.x || 0) * rect.w * 0.4;
    const dy = (rect.h - dh) / 2 + (panel.y || 0) * rect.h * 0.4;
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    const g2 = ctx.createLinearGradient(0, 0, rect.w, rect.h);
    g2.addColorStop(0, grade.sky[0]);
    g2.addColorStop(1, grade.sky[1]);
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, rect.w, rect.h);
  }
  // Grade tint over the photo.
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = grade.tintAlpha;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, rect.w, rect.h);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  // Inner inked edge, poster style.
  ctx.lineWidth = Math.max(2, rect.w * 0.008);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.strokeRect(0, 0, rect.w, rect.h);
  ctx.lineWidth = Math.max(3, rect.w * 0.012);
  ctx.strokeStyle = "rgba(13,6,24,0.9)";
  ctx.strokeRect(-rect.w * 0.006, -rect.h * 0.006, rect.w * 1.012, rect.h * 1.012);
  ctx.restore();
}

function drawStar(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.strokeStyle = "rgba(13,6,24,0.9)";
  ctx.stroke();
}

function drawTitleBlock(ctx, state, grade, W, H, rng) {
  const bandY = H * 0.76;
  const bandH = H * 0.24;
  // Dark poster band so the title reads against any grade's sky.
  const bandGrad = ctx.createLinearGradient(0, bandY, 0, H);
  bandGrad.addColorStop(0, grade.sky[0]);
  bandGrad.addColorStop(1, "#0d0618");
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, bandY, W, bandH);
  ctx.globalAlpha = 1;
  // Halftone dots behind the title.
  if (state.halftone) {
    const step = Math.max(10, W * 0.016);
    for (let y = bandY + step * 0.6; y < H; y += step) {
      for (let x = step * 0.5; x < W; x += step) {
        const depth = (y - bandY) / bandH;
        const r = step * (0.08 + depth * 0.22);
        ctx.globalAlpha = 0.16 + depth * 0.22;
        ctx.fillStyle = grade.accent;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  // Badge ribbon, top-left of the band.
  const badgeText = (state.badge || "").toUpperCase();
  if (badgeText) {
    ctx.save();
    ctx.font = `900 ${Math.round(H * 0.028)}px 'Arial Black','Helvetica Neue',Arial,sans-serif`;
    const bw = ctx.measureText(badgeText).width + H * 0.05;
    const bh = H * 0.052;
    const bx = W * 0.055 + bw / 2; // left edge of the ribbon stays on-canvas
    ctx.translate(bx, bandY + bandH * 0.16);
    ctx.rotate(-0.045);
    ctx.fillStyle = grade.accent;
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, 0, H * 0.002);
    ctx.restore();
  }
  // Big title: heavy system sans, gradient fill, dark outline, drop shadow.
  const title = (state.title || "NEON VICE").toUpperCase();
  let size = H * 0.115;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const setTitleFont = (s) => {
    ctx.font = `900 ${Math.round(s)}px 'Arial Black','Helvetica Neue',Arial,sans-serif`;
    try {
      ctx.letterSpacing = `${Math.round(s * 0.01)}px`;
    } catch {
      /* older canvas: ignore */
    }
  };
  setTitleFont(size);
  const maxW = W * 0.94;
  while (ctx.measureText(title).width > maxW && size > H * 0.04) {
    size *= 0.92;
    setTitleFont(size);
  }
  const ty = bandY + bandH * 0.52;
  const grad = ctx.createLinearGradient(0, ty - size * 0.55, 0, ty + size * 0.55);
  grad.addColorStop(0, grade.title[0]);
  grad.addColorStop(0.5, grade.title[1]);
  grad.addColorStop(1, grade.title[2]);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.75)";
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.05;
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#12041f";
  ctx.strokeText(title, W / 2, ty);
  ctx.fillStyle = grad;
  ctx.fillText(title, W / 2, ty);
  ctx.restore();
  try {
    ctx.letterSpacing = "0px";
  } catch {
    /* ignore */
  }
  // Neon script subtitle.
  const sub = state.subtitle || "";
  if (sub) {
    const ss = H * 0.042;
    ctx.font = `italic 700 ${Math.round(ss)}px 'Brush Script MT','Segoe Script','Snell Roundhand',cursive`;
    ctx.save();
    ctx.shadowColor = grade.glow;
    ctx.shadowBlur = ss * 0.7;
    ctx.fillStyle = grade.script;
    ctx.fillText(sub, W / 2, bandY + bandH * 0.86);
    ctx.shadowBlur = ss * 0.25;
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.9;
    ctx.fillText(sub, W / 2, bandY + bandH * 0.86);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  // Heat meter: 5 stars, bottom-right.
  const sr = H * 0.02;
  const cx0 = W * 0.94 - sr * 9;
  const cy = bandY + bandH * 0.16;
  for (let i = 0; i < 5; i++) {
    const filled = i < (state.heat || 0);
    drawStar(ctx, cx0 + i * sr * 2.1, cy, sr, filled ? "#ffd166" : "rgba(255,255,255,0.18)");
  }
}

export function renderCover(ctx, state, W, H, images, rngSeed) {
  const grade = gradeOf(state);
  const rng = mulberry32(rngSeed ?? state.seed ?? 42);
  ctx.clearRect(0, 0, W, H);
  drawSky(ctx, grade, W, H, rng);
  const rects = layoutPanels(state.layout, W, H);
  const count = layoutOf(state).panels;
  for (let i = 0; i < count; i++) {
    const panel = state.panels[i] || state.panels[0];
    drawPhoto(ctx, images ? images.get(panel.src) : null, rects[i], panel, grade);
  }
  // Full-bleed keeps the title over the photo; other layouts draw it in
  // the band over the sky.
  drawTitleBlock(ctx, state, grade, W, H, rng);
  if (state.grain) {
    for (let i = 0; i < Math.floor((W * H) / 900); i++) {
      ctx.globalAlpha = 0.05 + rng() * 0.09;
      ctx.fillStyle = rng() > 0.5 ? "#ffffff" : "#000000";
      ctx.fillRect(rng() * W, rng() * H, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
  }
  if (state.vignette) {
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }
}

export function renderToCanvas(state, W, H) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  return loadPanelImages(state).then((images) => {
    renderCover(ctx, state, W, H, images);
    return canvas;
  });
}
