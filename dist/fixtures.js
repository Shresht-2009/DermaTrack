// Numerical phantoms for software tests only. These are not clinical images.
export function phantom({
  change = 0,
  dx = 0,
  dy = 0,
  angle = 0,
  light = 0,
  skin = [195, 146, 116],
  size = 192,
} = {}) {
  const data = new Uint8ClampedArray(size * size * 4),
    mask = new Uint8Array(size * size),
    c = Math.cos(angle),
    s = Math.sin(angle);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const xx = x - size / 2 - dx,
        yy = y - size / 2 - dy,
        u = xx * c + yy * s,
        v = -xx * s + yy * c;
      const r = Math.sqrt((u / 39) ** 2 + (v / 31) ** 2),
        theta = Math.atan2(v / 31, u / 39),
        limit =
          1 +
          change * 0.16 * Math.cos(3 * theta) +
          change * 0.14 * Math.max(0, Math.cos(theta));
      const blend = Math.max(0, Math.min(1, (limit - r) * 6 + 0.5));
      mask[y * size + x] = r <= limit ? 1 : 0;
      const texture =
        Math.sin(u * 0.37) * Math.cos(v * 0.27) * 2 +
        Math.sin((u + v) * 0.13) * 2;
      const spot = [
        85 + texture - change * 25 * (u > 0 ? 1 : 0),
        51 + texture - change * 13 * (u > 0 ? 1 : 0),
        36 + texture - change * 10 * (u > 0 ? 1 : 0),
      ];
      const noise = Math.sin(x * 7 + y * 11) * 0.6;
      for (let k = 0; k < 3; k++)
        data[(y * size + x) * 4 + k] = Math.max(
          0,
          Math.min(
            255,
            skin[k] * (1 - blend) + spot[k] * blend + noise + light,
          ),
        );
      data[(y * size + x) * 4 + 3] = 255;
    }
  return { data, mask, w: size, h: size };
}
