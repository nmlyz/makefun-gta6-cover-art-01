// Vice Cover Maker — cover renderer.
// Draws the multi-panel poster onto any 2d canvas: white frame, sunset sky,
// per-panel photos with a gradient-map grade, bold Anton title block with a
// Pacifico script subtitle, optional halftone dots, grain and vignette.

export const LAYOUTS = {
  hero3: { label: "Hero + 3", panels: 4 },
  grid4: { label: "Four grid", panels: 4 },
  grid9: { label: "Nine grid", panels: 9 },
  collage: { label: "Snapshots", panels: 4 },
  fullbleed: { label: "Full bleed", panels: 1 },
};

export const GRADES = {
  sunset: {
    label: "Sunset",
    filter: "saturate(1.35) contrast(1.08) brightness(1.02)",
    stops: ["#ffb347", "#ff5e7a", "#b04df0"],
    blend: "soft-light",
    sky: ["#ffd166", "#ff7e5f", "#c94b8a", "#5b2a86"],
  },
  neon: {
    label: "Neon pink / teal",
    filter: "saturate(1.55) contrast(1.12)",
    stops: ["#ff2e88", "#7b2ff7", "#22e6c8"],
    blend: "overlay",
    sky: ["#ff9de2", "#ff2e88", "#7b2ff7", "#141b4d"],
  },
  golden: {
    label: "Golden hour",
    filter: "saturate(1.25) contrast(1.05) brightness(1.06)",
    stops: ["#ffe08a", "#ff9a3d", "#c96a1e"],
    blend: "soft-light",
    sky: ["#fff3b0", "#ffc46b", "#ff8c42", "#7a3b12"],
  },
  noir: {
    label: "Noir",
    filter: "saturate(0.12) contrast(1.28) brightness(0.96)",
    stops: ["#d9d9d9", "#8a8a8a", "#2b2b2b"],
    blend: "multiply",
    sky: ["#e8e8e8", "#9a9a9a", "#4a4a4a", "#111111"],
  },
  vice: {
    label: "Vice purple",
    filter: "saturate(1.45) contrast(1.1)",
    stops: ["#c084fc", "#7c3aed", "#06b6d4"],
    blend: "overlay",
    sky: ["#f0abfc", "#c084fc", "#7c3aed", "#0e7490"],
  },
};

export const SIZES = {
  square: { label: "1080 × 1080", w: 1080, h: 1080 },
  portrait: { label: "1080 × 1350", w: 1080, h: 1350 },
  wide: { label: "1920 × 1080", w: 1920, h: 1080 },
};

const TAU = Math.PI * 2;

function panelRects(layout, w, h) {
  const band = Math.round(h * 0.16); // title band along the bottom
  const top = h - band;
  const g = Math.max(8, Math.round(w * 0.012)); // white gutter
  const rect = (fx, fy, fw, fh, rot = 0) => ({
    x: Math.round(fx * w), y: Math.round(fy * h),
    w: Math.round(fw * w), h: Math.round(fh * h), rot,
  });
  switch (layout) {
    case "hero3": {
      const third = (top - g * 3) / 3;
      return {
        band, top,
        panels: [
          rect(0, 0, 1, (top - g * 2) / h * 0.66),
          rect(0, (top * 0.66 + g) / h, (w - g * 2) / w / 3, third / h),
          rect((third + g) / w, (top * 0.66 + g) / h, third / w, third / h),
          rect((third * 2 + g * 2) / w, (top * 0.66 + g) / h, third / w, third / h),
        ],
      };
    }
    case "grid4": {
      const cw = (w - g * 3) / 2, ch = (top - g * 3) / 2;
      return {
        band, top,
        panels: [
          rect(0, 0, cw / w, ch / h),
          rect((cw + g) / w, 0, cw / w, ch / h),
          rect(0, (ch + g) / h, cw / w, ch / h),
          rect((cw + g) / w, (ch + g) / h, cw / w, ch / h),
        ],
      };
    }
    case "grid9": {
      const cw = (w - g * 4) / 3, ch = (top - g * 4) / 3;
      const out = [];
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++)
          out.push(rect((cw * c + g * c) / w, (ch * r + g * r) / h, cw / w, ch / h));
      return { band, top, panels: out };
    }
    case "collage": {
      const ph = top * 0.46, pw = w * 0.46;
      return {
        band, top,
        panels: [
          rect(0.03, 0.02, pw / w, ph / h, -0.07),
          rect(0.51, 0.015, pw / w, ph / h, 0.05),
          rect(0.05, 0.48, pw / w, ph / h, 0.055),
          rect(0.5, 0.475, pw / w, ph / h, -0.05),
        ],
      };
    }
    case "fullbleed":
    default:
      return { band, top, panels: [rect(0, 0, 1, 1)] };
  }
}

function drawPhotoInto(ctx, img, p, grade) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(p.w / iw, p.h / ih) * (p.zoom || 1);
  const dw = iw * base, dh = ih * base;
  const dx = p.x + (p.w - dw) / 2 + (p.ox || 0) * p.w;
  const dy = p.y + (p.h - dh) / 2 + (p.oy || 0) * p.h;
  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
  ctx.rotate(p.rot || 0);
  ctx.translate(-(p.x + p.w / 2), -(p.y + p.h / 2));
  ctx.beginPath();
  ctx.rect(p.x, p.y, p.w, p.h);
  ctx.clip();
  ctx.filter = grade.filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = "none";
  const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
  grade.stops.forEach((c, i) => grad.addColorStop(i / (grade.stops.length - 1), c));
  ctx.globalCompositeOperation = grade.blend;
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = grad;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

let noiseCanvas = null;
function grainTile() {
  if (noiseCanvas) return noiseCanvas;
  noiseCanvas = document.createElement("canvas");
  noiseCanvas.width = 140;
  noiseCanvas.height = 140;
  const c = noiseCanvas.getContext("2d");
  const data = c.createImageData(140, 140);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 90);
    data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 255;
  }
  c.putImageData(data, 0, 0);
  return noiseCanvas;
}

function drawHalftone(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  const step = Math.max(9, Math.round(w / 64));
  for (let yy = y + step / 2; yy < y + h; yy += step) {
    for (let xx = x + step / 2; xx < x + w; xx += step) {
      const fade = 1 - (yy - y) / h;
      ctx.globalAlpha = 0.10 + 0.30 * fade;
      ctx.beginPath();
      ctx.arc(xx, yy, step * 0.16 + step * 0.14 * fade, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function fitFont(ctx, text, font, maxW, startPx) {
  let px = startPx;
  ctx.font = font(px);
  while (px > 12 && ctx.measureText(text).width > maxW) {
    px -= 2;
    ctx.font = font(px);
  }
  return px;
}

function drawTitleBlock(ctx, w, h, band, top, state, grade) {
  const y0 = top;
  const bg = ctx.createLinearGradient(0, y0, w, h);
  bg.addColorStop(0, "#2a1150");
  bg.addColorStop(0.55, "#c22a7e");
  bg.addColorStop(1, "#ff7e3d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, y0, w, band);
  if (state.halftone) drawHalftone(ctx, 0, y0, w, band, "#ffffff");
  const pad = Math.round(w * 0.045);
  const innerW = w - pad * 2;
  const title = (state.title || "VICE CITY").toUpperCase();
  const sub = state.subtitle || "";
  const titlePx = fitFont(ctx, title, (px) => `${px}px Anton, sans-serif`, innerW, Math.round(band * 0.52));
  const subPx = Math.round(band * 0.2);
  const total = titlePx * 0.98 + subPx * 1.5;
  let ty = y0 + (band - total) / 2 + titlePx * 0.82;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  try { ctx.letterSpacing = `${Math.round(titlePx * 0.04)}px`; } catch (_) { /* older canvas */ }
  ctx.font = `${titlePx}px Anton, sans-serif`;
  ctx.shadowColor = "rgba(20,0,40,0.55)";
  ctx.shadowBlur = Math.round(titlePx * 0.08);
  ctx.shadowOffsetY = Math.round(titlePx * 0.04);
  ctx.lineWidth = Math.max(2, Math.round(titlePx / 16));
  ctx.strokeStyle = "#2a0a4a";
  ctx.strokeText(title, w / 2, ty);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(title, w / 2, ty);
  ctx.restore();
  if (sub) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `${subPx}px Pacifico, cursive`;
    ctx.fillStyle = "#ffd166";
    ctx.shadowColor = "rgba(20,0,40,0.6)";
    ctx.shadowBlur = Math.round(subPx * 0.25);
    ctx.fillText(sub, w / 2, y0 + (band - total) / 2 + titlePx * 0.98 + subPx * 1.25);
    ctx.restore();
  }
}

// state: { layout, grade, title, subtitle, halftone, grain, vignette,
//           panels: [{ photo: HTMLImageElement|null, zoom, ox, oy }] }
// photos: the panel objects carry their image directly.
export function drawCover(ctx, w, h, state) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const geo = panelRects(state.layout || "hero3", w, h);
  const sky = ctx.createLinearGradient(0, 0, w, h * 0.55);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, geo.top);
  // Sun disc behind the panels, low in the sky.
  ctx.save();
  ctx.fillStyle = "rgba(255, 240, 170, 0.9)";
  ctx.beginPath();
  ctx.arc(w * 0.78, geo.top * 0.42, Math.min(w, h) * 0.11, 0, TAU);
  ctx.fill();
  ctx.restore();

  const panels = geo.panels;
  for (let i = 0; i < panels.length; i++) {
    const slot = state.panels[i];
    const p = { ...panels[i], zoom: slot?.zoom ?? 1, ox: slot?.ox ?? 0, oy: slot?.oy ?? 0 };
    if (state.layout === "collage") {
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.rot);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-p.w / 2 - 7, -p.h / 2 - 7, p.w + 14, p.h + 14);
      ctx.restore();
    }
    if (slot?.photo) {
      drawPhotoInto(ctx, slot.photo, p, grade);
    } else {
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.rot || 0);
      ctx.fillStyle = "rgba(30,10,55,0.28)";
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = `${Math.max(13, Math.round(Math.min(p.w, p.h) * 0.09))}px Anton, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("DROP A PHOTO", 0, 0);
      ctx.restore();
    }
  }

  if (state.layout === "fullbleed") {
    const scrim = ctx.createLinearGradient(0, geo.top - h * 0.22, 0, h);
    scrim.addColorStop(0, "rgba(20,5,40,0)");
    scrim.addColorStop(1, "rgba(20,5,40,0.55)");
    ctx.fillStyle = scrim;
    ctx.fillRect(0, geo.top - h * 0.22, w, h - geo.top + h * 0.22);
  }

  drawTitleBlock(ctx, w, h, geo.band, geo.top, state, grade);

  if (state.vignette) {
    const v = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.42,
      w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(10,0,25,0.38)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = ctx.createPattern(grainTile(), "repeat");
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  return geo;
}

// Panel hit-test in canvas pixel coordinates (accounts for collage rotation
// by testing the unrotated rect, which is close enough for a click).
export function panelAt(layout, w, h, px, py) {
  const geo = panelRects(layout, w, h);
  for (let i = geo.panels.length - 1; i >= 0; i--) {
    const p = geo.panels[i];
    if (px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) return i;
  }
  return -1;
}

export function panelCount(layout) {
  return LAYOUTS[layout]?.panels ?? 4;
}
