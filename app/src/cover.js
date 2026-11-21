// Neon Vice Cover Studio — cover render engine.
// Draws the whole poster on one 2D canvas: sky, sun, skyline, palms,
// photo panels, halftone title block, badge ribbon and heat stars.
// Pure drawing: given a canvas, a size, a state object and loaded
// photo images, it paints the cover. No network, no Date, no Math.random
// inside the render path — every random-looking value comes from a
// fixed-seed generator so the same state always draws the same cover.

export const SAMPLE_PHOTOS = [
  { id: 'woman-car', src: 'samples/woman-car.jpg', label: 'Boulevard' },
  { id: 'man-rooftop', src: 'samples/man-rooftop.jpg', label: 'Rooftop' },
  { id: 'friends-neon', src: 'samples/friends-neon.jpg', label: 'Neon diner' },
];

export const GRADES = {
  sunset: {
    label: 'Sunset', sky: ['#2b1055', '#7597de', '#ff7e5f', '#feb47b'],
    sun: '#ffd76a', tint: '#ff8c42', band: ['#3b0f54', '#ff2e63'],
    title: ['#ffffff', '#ffe259'], sub: '#ffd76a', frame: '#ffffff',
  },
  neonNight: {
    label: 'Neon night', sky: ['#0b0620', '#1b0f45', '#c2187a', '#2de2c5'],
    sun: '#ff5da2', tint: '#ff2e88', band: ['#12042b', '#ff2e88'],
    title: ['#ffffff', '#7df9ff'], sub: '#ff5da2', frame: '#e8fbff',
  },
  vicePink: {
    label: 'Vice pink', sky: ['#3d0a4e', '#a4138a', '#ff4d8d', '#ff9e7d'],
    sun: '#ffe259', tint: '#ff4d8d', band: ['#4a0a5e', '#ff2e88'],
    title: ['#ffffff', '#ffb3d9'], sub: '#ffd76a', frame: '#ffffff',
  },
  tealDusk: {
    label: 'Teal dusk', sky: ['#062a33', '#0e5a6d', '#2de2c5', '#f7b733'],
    sun: '#ffe9a8', tint: '#2de2c5', band: ['#052e3a', '#0e7490'],
    title: ['#ffffff', '#a5f3fc'], sub: '#5eead4', frame: '#e0f7fa',
  },
  monoNoir: {
    label: 'Mono noir', sky: ['#0a0a0a', '#3a3a3a', '#8a8a8a', '#e8e8e8'],
    sun: '#f5f5f5', tint: '#9a9a9a', band: ['#111111', '#555555'],
    title: ['#ffffff', '#d4d4d4'], sub: '#e5e5e5', frame: '#ffffff',
  },
  goldenHour: {
    label: 'Golden hour', sky: ['#3a1c00', '#b25a1b', '#f7b733', '#fceabb'],
    sun: '#fff3b0', tint: '#f7b733', band: ['#4a2400', '#e8890c'],
    title: ['#ffffff', '#ffe259'], sub: '#ffb347', frame: '#fff7e0',
  },
  magentaHaze: {
    label: 'Magenta haze', sky: ['#1d0533', '#6d28a8', '#d946ef', '#f0abfc'],
    sun: '#fbcfe8', tint: '#d946ef', band: ['#2a0a4a', '#c026d3'],
    title: ['#ffffff', '#f5d0fe'], sub: '#f0abfc', frame: '#fdf4ff',
  },
};

export const LAYOUTS = {
  hero3: { label: 'Hero + 3', panels: 4 },
  four: { label: 'Four grid', panels: 4 },
  nine: { label: 'Nine grid', panels: 9 },
  six: { label: 'Six grid', panels: 6 },
  trio: { label: 'Trio columns', panels: 3 },
  snapshots: { label: 'Snapshots', panels: 4 },
  fullbleed: { label: 'Full bleed', panels: 1 },
};

export const SIZES = [
  { id: 'square', label: '1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: '1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: '1920 × 1080', w: 1920, h: 1080 },
  { id: 'story', label: '1080 × 1920', w: 1080, h: 1920 },
];

export function defaultState() {
  return {
    layout: 'hero3',
    grade: 'sunset',
    sizeId: 'portrait',
    title: 'VICE CITY',
    subtitle: 'Neon Nights',
    badge: 'VICE HEAT',
    heat: 4,
    halftone: true,
    grain: true,
    vignette: true,
    skyline: true,
    palms: true,
    panels: [
      { photo: 0, zoom: 1, ox: 0.5, oy: 0.42 },
      { photo: 1, zoom: 1, ox: 0.5, oy: 0.45 },
      { photo: 2, zoom: 1, ox: 0.5, oy: 0.5 },
      { photo: 0, zoom: 1.25, ox: 0.62, oy: 0.4 },
      { photo: 1, zoom: 1, ox: 0.5, oy: 0.45 },
      { photo: 2, zoom: 1, ox: 0.5, oy: 0.5 },
      { photo: 0, zoom: 1, ox: 0.5, oy: 0.42 },
      { photo: 1, zoom: 1, ox: 0.5, oy: 0.45 },
      { photo: 2, zoom: 1, ox: 0.5, oy: 0.5 },
    ],
  };
}

// Fixed-seed generator: deterministic art, same cover every run.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gridRects(cols, rows, x, y, w, h, gap) {
  const out = [];
  const cw = (w - gap * (cols - 1)) / cols;
  const ch = (h - gap * (rows - 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({ x: x + c * (cw + gap), y: y + r * (ch + gap), w: cw, h: ch, rot: 0 });
    }
  }
  return out;
}

// Panel geometry for a layout at W x H. Returns { panels, bandTop }.
// bandTop is the y where the title block starts; panels never overlap it,
// except fullbleed where the single photo runs under the band.
export function layoutGeometry(layout, W, H) {
  const gap = Math.max(6, Math.round(W * 0.009));
  const bandTop = Math.round(H * 0.82);
  const bodyH = bandTop - gap;
  const cols3 = (w) => (w - gap * 2) / 3;
  switch (layout) {
    case 'hero3': {
      const heroH = Math.round(bodyH * 0.68);
      const rowY = heroH + gap;
      const rowH = bodyH - rowY;
      const cw = cols3(W);
      return {
        panels: [
          { x: 0, y: 0, w: W, h: heroH, rot: 0 },
          { x: 0, y: rowY, w: cw, h: rowH, rot: 0 },
          { x: cw + gap, y: rowY, w: cw, h: rowH, rot: 0 },
          { x: 2 * (cw + gap), y: rowY, w: cw, h: rowH, rot: 0 },
        ],
        bandTop,
      };
    }
    case 'four':
      return { panels: gridRects(2, 2, 0, 0, W, bodyH, gap), bandTop };
    case 'nine':
      return { panels: gridRects(3, 3, 0, 0, W, bodyH, gap), bandTop };
    case 'six':
      return { panels: gridRects(3, 2, 0, 0, W, bodyH, gap), bandTop };
    case 'trio':
      return { panels: gridRects(3, 1, 0, 0, W, bodyH, gap), bandTop };
    case 'snapshots': {
      const areaH = Math.round(H * 0.79);
      const pw = W * 0.46;
      const ph = areaH * 0.47;
      const rots = [-0.045, 0.04, -0.035, 0.05];
      const spots = [
        { x: W * 0.03, y: areaH * 0.02 },
        { x: W * 0.51, y: areaH * 0.04 },
        { x: W * 0.06, y: areaH * 0.51 },
        { x: W * 0.53, y: areaH * 0.49 },
      ];
      return {
        panels: spots.map((s, i) => ({ x: s.x, y: s.y, w: pw, h: ph, rot: rots[i], polaroid: true })),
        bandTop: Math.round(H * 0.80),
      };
    }
    case 'fullbleed':
    default:
      return { panels: [{ x: 0, y: 0, w: W, h: H, rot: 0 }], bandTop };
  }
}

function drawSky(ctx, W, H, grade, seed) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // Sun disc with glow.
  const sx = W * 0.72;
  const sy = H * 0.26;
  const sr = Math.min(W, H) * 0.11;
  const glow = ctx.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 2.6);
  glow.addColorStop(0, grade.sun);
  glow.addColorStop(0.35, grade.sun + '55');
  glow.addColorStop(1, grade.sun + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6);
  ctx.fillStyle = grade.sun;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();
  // Retro sun slats across the lower half of the disc.
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = grade.sky[0];
  for (let i = 0; i < 4; i++) {
    const yy = sy + sr * (0.05 + i * 0.22);
    ctx.fillRect(sx - sr, yy, sr * 2, sr * 0.05 + i * 1.5);
  }
  ctx.restore();
  void seed;
}

function drawSkyline(ctx, W, H, top, grade) {
  const rnd = mulberry32(20261119);
  const base = top;
  ctx.fillStyle = '#160a24';
  let x = -10;
  while (x < W + 10) {
    const bw = W * (0.05 + rnd() * 0.09);
    const bh = H * (0.04 + rnd() * 0.11);
    ctx.fillRect(x, base - bh, bw, bh);
    // Lit windows.
    ctx.fillStyle = 'rgba(255, 214, 106, 0.75)';
    const cols = Math.max(1, Math.floor(bw / (W * 0.018)));
    const rows = Math.max(1, Math.floor(bh / (H * 0.03)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rnd() < 0.32) {
          ctx.fillRect(x + 4 + c * (W * 0.018), base - bh + 6 + r * (H * 0.03), 3, 4);
        }
      }
    }
    ctx.fillStyle = '#160a24';
    // Rooftop antenna on some towers.
    if (rnd() < 0.4) {
      ctx.fillRect(x + bw / 2 - 1, base - bh - H * 0.03, 2, H * 0.03);
      ctx.fillStyle = '#ff2e63';
      ctx.beginPath();
      ctx.arc(x + bw / 2, base - bh - H * 0.032, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#160a24';
    }
    x += bw + W * 0.008;
  }
  void grade;
}

function drawPalm(ctx, x, y, s, lean, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk: gentle curve.
  ctx.lineWidth = s * 0.09;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.06, -s * 0.55, s * 0.16, -s * 0.95);
  ctx.stroke();
  const topX = s * 0.16;
  const topY = -s * 0.95;
  // Fronds: seven drooping arcs.
  ctx.lineWidth = s * 0.045;
  for (let i = 0; i < 7; i++) {
    const a = (-Math.PI * 0.15) - (i * Math.PI * 0.11);
    const ex = topX + Math.cos(a) * s * 0.62;
    const ey = topY + Math.sin(a) * s * 0.42 + s * 0.22;
    const mx = topX + Math.cos(a) * s * 0.34;
    const my = topY + Math.sin(a) * s * 0.3 - s * 0.1;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
  }
  // Coconuts.
  ctx.beginPath();
  ctx.arc(topX - s * 0.03, topY + s * 0.05, s * 0.045, 0, Math.PI * 2);
  ctx.arc(topX + s * 0.05, topY + s * 0.06, s * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPhotoInto(ctx, img, panel, state, grade) {
  const { x, y, w, h } = panel;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const base = Math.max(w / iw, h / ih);
  const scale = base * (state.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  let dx = x + w / 2 - (state.ox ?? 0.5) * dw;
  let dy = y + h / 2 - (state.oy ?? 0.5) * dh;
  dx = Math.min(x, Math.max(x + w - dw, dx));
  dy = Math.min(y, Math.max(y + h - dh, dy));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  // Grade wash: one soft-light tint + a warm top light.
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'overlay';
  const wash = ctx.createLinearGradient(x, y, x, y + h);
  wash.addColorStop(0, 'rgba(255, 190, 120, 0.14)');
  wash.addColorStop(0.6, 'rgba(255, 190, 120, 0)');
  wash.addColorStop(1, 'rgba(20, 0, 50, 0.12)');
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function framePanel(ctx, panel, W, grade, selected) {
  const { x, y, w, h, rot } = panel;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rot || 0);
  ctx.translate(-w / 2, -h / 2);
  // Drop shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.fillRect(4, 6, w, h);
  // Ink border: white frame + dark inner line, poster style.
  const lw = Math.max(3, Math.round(W * 0.004));
  ctx.lineWidth = lw;
  ctx.strokeStyle = grade.frame;
  ctx.strokeRect(0, 0, w, h);
  ctx.lineWidth = Math.max(1.5, lw * 0.45);
  ctx.strokeStyle = 'rgba(10, 2, 24, 0.85)';
  ctx.strokeRect(lw + 2, lw + 2, w - 2 * (lw + 2), h - 2 * (lw + 2));
  if (selected) {
    ctx.lineWidth = Math.max(3, W * 0.006);
    ctx.strokeStyle = '#2de2c5';
    ctx.setLineDash([14, 8]);
    ctx.strokeRect(-lw - 3, -lw - 3, w + 2 * (lw + 3), h + 2 * (lw + 3));
  }
  ctx.restore();
}

function drawHalftone(ctx, x, y, w, h, W) {
  const step = Math.max(12, W * 0.016);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
  for (let yy = y + step / 2; yy < y + h; yy += step) {
    for (let xx = x + step / 2; xx < x + w; xx += step) {
      const t = 1 - (xx - x) / w; // dots shrink left to right
      const r = (step * 0.16) + t * step * 0.2;
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStar(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = '#ffd76a';
    ctx.fill();
  }
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.strokeStyle = '#ffd76a';
  ctx.stroke();
}

function fitFont(ctx, text, fontFamily, maxW, startPx, weight) {
  let px = startPx;
  while (px > 12) {
    ctx.font = `${weight} ${px}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxW) return px;
    px -= 2;
  }
  return px;
}

// The main entry: paint a full cover at W x H.
// opts: { photos: Image[], selected: number, forExport: bool }
export function renderCover(ctx, W, H, state, photos, opts = {}) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const geo = layoutGeometry(state.layout, W, H);
  const gap = Math.max(6, Math.round(W * 0.009));

  drawSky(ctx, W, H, grade, 7);

  // Skyline: only the snapshots layout has open sky for it; in grid
  // layouts it would only peek through the thin gaps as dirt.
  const skyBottom = Math.round(H * 0.79);
  if (state.layout === 'snapshots' && state.skyline) {
    drawSkyline(ctx, W, H, skyBottom, grade);
  }

  // Panels.
  geo.panels.forEach((panel, i) => {
    const pstate = state.panels[i] || { photo: 0, zoom: 1, ox: 0.5, oy: 0.5 };
    const img = photos[pstate.photo];
    ctx.save();
    if (panel.rot) {
      ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
      ctx.rotate(panel.rot);
      ctx.translate(-panel.w / 2, -panel.h / 2);
    }
    if (panel.polaroid) {
      const pad = Math.max(8, W * 0.012);
      const bottom = pad * 2.6;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(5 - pad, 8 - pad, panel.w + pad * 2, panel.h + pad + bottom);
      ctx.fillStyle = '#fdfbf6';
      ctx.fillRect(-pad, -pad, panel.w + pad * 2, panel.h + pad + bottom);
    }
    if (img) {
      const inner = panel.polaroid
        ? { x: 0, y: 0, w: panel.w, h: panel.h }
        : { x: panel.x, y: panel.y, w: panel.w, h: panel.h };
      // drawPhotoInto clips to the rect it is given; for rotated panels
      // the transform above already positions the local frame.
      if (panel.rot || panel.polaroid) {
        drawPhotoInto(ctx, img, inner, pstate, grade);
      } else {
        drawPhotoInto(ctx, img, inner, pstate, grade);
      }
    } else {
      ctx.fillStyle = 'rgba(20, 6, 36, 0.55)';
      ctx.fillRect(panel.rot ? 0 : panel.x, panel.rot ? 0 : panel.y, panel.w, panel.h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = `600 ${Math.max(14, W * 0.016)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Drop a photo here', panel.rot ? panel.w / 2 : panel.x + panel.w / 2, panel.rot ? panel.h / 2 : panel.y + panel.h / 2);
    }
    ctx.restore();
    if (!panel.polaroid) {
      framePanel(ctx, panel, W, grade, opts.selected === i && !opts.forExport);
    } else {
      // Polaroid: thin ink line around the photo area only.
      ctx.save();
      ctx.translate(panel.x + panel.w / 2, panel.y + panel.h / 2);
      ctx.rotate(panel.rot || 0);
      ctx.translate(-panel.w / 2, -panel.h / 2);
      ctx.lineWidth = Math.max(1.5, W * 0.002);
      ctx.strokeStyle = 'rgba(10, 2, 24, 0.6)';
      ctx.strokeRect(0, 0, panel.w, panel.h);
      ctx.restore();
    }
  });

  // Foreground palms frame the snapshots collage, rising from the
  // title band in front of the bottom photos.
  if (state.layout === 'snapshots' && state.palms) {
    const s = Math.min(W, H) * 0.13;
    drawPalm(ctx, W * 0.03, geo.bandTop + 2, s, 0.12, '#12081f');
    drawPalm(ctx, W * 0.97, geo.bandTop + 2, s * 0.9, -0.14, '#12081f');
  }

  // Title block.
  const bandY = geo.bandTop;
  const bandH = H - bandY;
  const bandGrad = ctx.createLinearGradient(0, bandY, W, bandY);
  bandGrad.addColorStop(0, grade.band[0]);
  bandGrad.addColorStop(1, grade.band[1]);
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, bandY, W, bandH);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.fillRect(0, bandY, W, Math.max(2, H * 0.004));
  if (state.halftone) drawHalftone(ctx, 0, bandY, W, bandH, W);

  // Full-bleed scrim so the title stays readable over the photo.
  if (state.layout === 'fullbleed') {
    const scrim = ctx.createLinearGradient(0, bandY - bandH * 0.9, 0, H);
    scrim.addColorStop(0, 'rgba(10, 2, 24, 0)');
    scrim.addColorStop(1, 'rgba(10, 2, 24, 0.55)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, bandY - bandH * 0.9, W, bandH * 1.9);
  }

  // Title: Anton, gradient fill, dark outline, hard shadow.
  const title = (state.title || 'VICE CITY').toUpperCase();
  const titlePx = fitFont(ctx, title, 'Anton, "Arial Black", sans-serif', W * 0.92, bandH * 0.52, 400);
  const titleGrad = ctx.createLinearGradient(0, bandY + bandH * 0.18, 0, bandY + bandH * 0.72);
  titleGrad.addColorStop(0, grade.title[0]);
  titleGrad.addColorStop(1, grade.title[1]);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${titlePx}px Anton, "Arial Black", sans-serif`;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = Math.max(3, titlePx * 0.06);
  ctx.lineWidth = Math.max(4, titlePx * 0.10);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1a0533';
  ctx.strokeText(title, W / 2, bandY + bandH * 0.40);
  ctx.fillStyle = titleGrad;
  ctx.fillText(title, W / 2, bandY + bandH * 0.40);
  ctx.restore();

  // Subtitle: Pacifico script with a neon glow.
  const sub = state.subtitle || '';
  if (sub) {
    const subPx = fitFont(ctx, sub, 'Pacifico, cursive', W * 0.72, bandH * 0.24, 400);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${subPx}px Pacifico, cursive`;
    ctx.shadowColor = grade.sub;
    ctx.shadowBlur = Math.max(8, subPx * 0.45);
    ctx.fillStyle = grade.sub;
    ctx.fillText(sub, W / 2, bandY + bandH * 0.80);
    ctx.restore();
  }

  // Badge ribbon, top-right corner.
  if (state.badge) {
    const ribbonH = Math.max(26, H * 0.038);
    const ribbonW = Math.max(150, W * 0.30);
    ctx.save();
    ctx.translate(W, 0);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ff2e63';
    ctx.fillRect(-ribbonW / 2, -ribbonH / 2 + ribbonW * 0.28, ribbonW, ribbonH);
    ctx.fillStyle = '#ffd76a';
    ctx.fillRect(-ribbonW / 2, -ribbonH / 2 + ribbonW * 0.28, ribbonW, 3);
    ctx.fillRect(-ribbonW / 2, ribbonH / 2 + ribbonW * 0.28 - 3, ribbonW, 3);
    ctx.fillStyle = '#ffffff';
    ctx.font = `400 ${Math.max(13, ribbonH * 0.52)}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.badge.toUpperCase(), 0, ribbonW * 0.28 + 1);
    ctx.restore();
  }

  // Heat meter: five stars in a dark pill, top-left.
  {
    const pillH = Math.max(30, H * 0.042);
    const starR = pillH * 0.30;
    const pillW = starR * 2 * 5 + starR * 2.4;
    ctx.save();
    ctx.fillStyle = 'rgba(10, 2, 24, 0.72)';
    roundRect(ctx, gap, gap, pillW, pillH, pillH / 2);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const cx = gap + starR * 1.3 + i * starR * 2;
      drawStar(ctx, cx, gap + pillH / 2, starR, i < (state.heat || 0));
    }
    ctx.restore();
  }

  // Grain + vignette.
  if (state.grain) drawGrain(ctx, W, H);
  if (state.vignette) {
    const vg = ctx.createRadialGradient(
      W / 2, H / 2, Math.min(W, H) * 0.42,
      W / 2, H / 2, Math.max(W, H) * 0.72,
    );
    vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vg.addColorStop(1, 'rgba(8, 0, 20, 0.34)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

let grainTile = null;
function drawGrain(ctx, W, H) {
  if (!grainTile) {
    const t = document.createElement('canvas');
    t.width = 140;
    t.height = 140;
    const tc = t.getContext('2d');
    const rnd = mulberry32(99);
    const img = tc.createImageData(140, 140);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rnd() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 28;
    }
    tc.putImageData(img, 0, 0);
    grainTile = t;
  }
  const pat = ctx.createPattern(grainTile, 'repeat');
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
