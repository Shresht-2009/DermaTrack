/* DermaTrack: deterministic, per-image unsupervised learning. No diagnosis. */
export const SIZE = 192;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function lab(r, g, b) {
  const lin = (v) =>
    (v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  r = lin(r);
  g = lin(g);
  b = lin(b);
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047),
    y = f(0.2126729 * r + 0.7151522 * g + 0.072175 * b),
    z = f((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const d2 = (a, b) =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
export function cluster(pixels, k = 4) {
  const pts = [];
  for (let i = 0; i < pixels.length; i += 16)
    pts.push(lab(...pixels.slice(i, i + 3)));
  const sorted = pts.slice().sort((a, b) => a[0] - b[0]);
  const centers = Array.from({ length: k }, (_, i) =>
    sorted[Math.floor(((i + 0.5) * sorted.length) / k)].slice(),
  );
  let iterations = 0;
  for (; iterations < 16; iterations++) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    let move = 0;
    for (const p of pts) {
      let c = 0,
        best = Infinity;
      centers.forEach((v, i) => {
        let d = d2(p, v);
        if (d < best) {
          best = d;
          c = i;
        }
      });
      for (let j = 0; j < 3; j++) sums[c][j] += p[j];
      sums[c][3]++;
    }
    centers.forEach((c, i) => {
      if (sums[i][3]) {
        const next = sums[i].slice(0, 3).map((v) => v / sums[i][3]);
        move += d2(c, next);
        centers[i] = next;
      }
    });
    if (move < 0.001) break;
  }
  return {
    centers,
    iterations: Math.min(iterations + 1, 16),
    samples: pts.length,
  };
}
export function segment(pixels, w, h, level = 0, seed = { x: 0.5, y: 0.5 }) {
  const model = cluster(pixels),
    labels = new Uint8Array(w * h),
    labs = new Float32Array(w * h * 3),
    edge = [0, 0, 0, 0];
  for (let i = 0; i < w * h; i++) {
    const p = lab(...pixels.slice(i * 4, i * 4 + 3));
    labs.set(p, i * 3);
    let best = Infinity,
      c = 0;
    model.centers.forEach((v, j) => {
      let d = d2(p, v);
      if (d < best) {
        best = d;
        c = j;
      }
    });
    labels[i] = c;
    const x = i % w,
      y = Math.floor(i / w);
    if (x < w * 0.08 || x > w * 0.92 || y < h * 0.08 || y > h * 0.92) edge[c]++;
  }
  const skin = model.centers[edge.indexOf(Math.max(...edge))];
  let seedIndex =
    clamp(Math.round(seed.y * (h - 1)), 0, h - 1) * w +
    clamp(Math.round(seed.x * (w - 1)), 0, w - 1);
  const seedColor = labs.slice(seedIndex * 3, seedIndex * 3 + 3),
    contrast = Math.sqrt(d2(seedColor, skin));
  // Relative distance to surrounding skin keeps this adaptable to different background colors.
  const threshold = Math.max(6, contrast * (0.35 + level * 0.005));
  const raw = new Uint8Array(w * h);
  for (let i = 0; i < raw.length; i++)
    raw[i] =
      Math.sqrt(d2(labs.slice(i * 3, i * 3 + 3), skin)) > threshold ? 1 : 0;
  // Majority filtering suppresses isolated sensor noise. Flood fill keeps only the seeded component.
  const filtered = raw.slice();
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      let n = 0;
      for (let yy = -1; yy <= 1; yy++)
        for (let xx = -1; xx <= 1; xx++) n += raw[(y + yy) * w + x + xx];
      filtered[y * w + x] = n >= 5 ? 1 : 0;
    }
  if (!filtered[seedIndex])
    throw Error(
      "The selected center does not separate from the background. Click inside the spot or try another photo.",
    );
  const mask = new Uint8Array(w * h),
    queue = [seedIndex];
  mask[seedIndex] = 1;
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q],
      x = i % w;
    for (const j of [x ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w])
      if (j >= 0 && j < mask.length && filtered[j] && !mask[j]) {
        mask[j] = 1;
        queue.push(j);
      }
  }
  const area = queue.length,
    coverage = area / (w * h);
  let border = 0;
  for (let i = 0; i < mask.length; i++)
    if (
      mask[i] &&
      (i % w === 0 || i % w === w - 1 || i < w || i >= w * (h - 1))
    )
      border++;
  if (area < 36 || coverage > 0.65 || border > 0 || contrast < 8)
    throw Error(
      "This outline is unreliable. Use one centered, clear spot with visible surrounding skin and click its center.",
    );
  let blur = 0,
    bn = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 3;
      const v =
        labs[i] * 4 -
        labs[i - 3] -
        labs[i + 3] -
        labs[i - w * 3] -
        labs[i + w * 3];
      blur += v * v;
      bn++;
    }
  const features = measure(mask, labs, w, h);
  const warnings = [];
  if (blur / bn < 2) warnings.push("Photo may be blurred; retake in focus.");
  if (contrast < 18)
    warnings.push("Low contrast. Check the outline carefully.");
  return {
    mask,
    labs,
    w,
    h,
    model,
    features,
    skin: Array.from(skin),
    contrast,
    blur: blur / bn,
    warnings,
  };
}
export function measure(mask, labs, w, h) {
  let area = 0,
    cx = 0,
    cy = 0;
  for (let i = 0; i < mask.length; i++)
    if (mask[i]) {
      area++;
      cx += i % w;
      cy += Math.floor(i / w);
    }
  cx /= area;
  cy /= area;
  let xx = 0,
    yy = 0,
    xy = 0,
    perimeter = 0,
    color = [0, 0, 0],
    minX = w,
    maxX = 0,
    minY = h,
    maxY = 0;
  for (let i = 0; i < mask.length; i++)
    if (mask[i]) {
      const x = i % w,
        y = Math.floor(i / w);
      xx += (x - cx) ** 2;
      yy += (y - cy) ** 2;
      xy += (x - cx) * (y - cy);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      for (const j of [x ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w])
        if (j < 0 || j >= mask.length || !mask[j]) perimeter++;
      for (let j = 0; j < 3; j++) color[j] += labs[i * 3 + j];
    }
  color = color.map((v) => v / area);
  let variance = 0;
  for (let i = 0; i < mask.length; i++)
    if (mask[i]) variance += d2(labs.slice(i * 3, i * 3 + 3), color);
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy),
    scale = Math.sqrt(area / Math.PI);
  let asym = 0;
  // Symmetry uses reflection about principal axes, averaged, divided by twice the area.
  for (let i = 0; i < mask.length; i++)
    if (mask[i]) {
      const dx = (i % w) - cx,
        dy = Math.floor(i / w) - cy,
        c = Math.cos(angle),
        s = Math.sin(angle),
        u = dx * c + dy * s,
        v = -dx * s + dy * c;
      for (const [a, b] of [
        [u, -v],
        [-u, v],
      ]) {
        const x = Math.round(cx + a * c - b * s),
          y = Math.round(cy + a * s + b * c);
        if (x < 0 || x >= w || y < 0 || y >= h || !mask[y * w + x]) asym++;
      }
    }
  return {
    area,
    cx,
    cy,
    angle,
    scale,
    asymmetry: (asym / (2 * area)) * 100,
    compactness: perimeter ** 2 / (4 * Math.PI * area),
    colorSpread: Math.sqrt(variance / area),
    meanColor: color,
    diameterPixels: Math.max(maxX - minX + 1, maxY - minY + 1),
  };
}
export function normalized(a, n = 160, angle = a.features.angle) {
  const out = new Uint8Array(n * n),
    colors = new Float32Array(n * n * 3),
    c = Math.cos(angle),
    s = Math.sin(angle),
    f = a.features;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const u = ((x - n / 2) / n) * 3.6 * f.scale,
        v = ((y - n / 2) / n) * 3.6 * f.scale,
        xx = Math.round(f.cx + u * c - v * s),
        yy = Math.round(f.cy + u * s + v * c),
        i = y * n + x;
      if (xx >= 0 && xx < a.w && yy >= 0 && yy < a.h) {
        const j = yy * a.w + xx;
        out[i] = a.mask[j];
        for (let k = 0; k < 3; k++)
          colors[i * 3 + k] = a.labs[j * 3 + k] - a.skin[k];
      }
    }
  return { mask: out, colors, n };
}
export function compare(a, b) {
  const first = normalized(a);
  let best = null;
  // Test orientation near PCA, plus its 180-degree ambiguity. Area normalization deliberately removes growth.
  for (let flip = 0; flip < 2; flip++)
    for (let deg = -30; deg <= 30; deg += 5) {
      const second = normalized(
        b,
        first.n,
        b.features.angle + flip * Math.PI + (deg * Math.PI) / 180,
      );
      let intersection = 0,
        union = 0;
      for (let i = 0; i < first.mask.length; i++) {
        intersection += first.mask[i] && second.mask[i] ? 1 : 0;
        union += first.mask[i] || second.mask[i] ? 1 : 0;
      }
      const iou = intersection / union;
      if (!best || iou > best.iou)
        best = { iou, second, rotation: deg + flip * 180 };
    }
  let colorDistance = 0,
    common = 0;
  const map = new Uint8Array(first.mask.length);
  for (let i = 0; i < map.length; i++) {
    const aa = first.mask[i],
      bb = best.second.mask[i];
    map[i] = aa && bb ? 1 : aa ? 2 : bb ? 3 : 0;
    if (aa && bb) {
      colorDistance += Math.sqrt(
        d2(
          first.colors.slice(i * 3, i * 3 + 3),
          best.second.colors.slice(i * 3, i * 3 + 3),
        ),
      );
      common++;
    }
  }
  const backgroundDelta = Math.sqrt(d2(a.skin, b.skin)),
    warnings = [...a.warnings, ...b.warnings];
  if (backgroundDelta > 10)
    warnings.push(
      "Background color differs; lighting can explain part of the color difference.",
    );
  return {
    shapeDifference: (1 - best.iou) * 100,
    colorDistance: colorDistance / common,
    asymmetryDelta: b.features.asymmetry - a.features.asymmetry,
    colorSpreadDelta: b.features.colorSpread - a.features.colorSpread,
    backgroundDelta,
    map,
    n: first.n,
    first,
    second: best.second,
    warnings: [...new Set(warnings)],
    rotation: best.rotation,
  };
}
