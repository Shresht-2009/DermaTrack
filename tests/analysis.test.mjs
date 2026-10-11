import assert from "node:assert/strict";
import { segment, compare, lab } from "../dist/analysis.js";
import { phantom } from "../dist/fixtures.js";
const analyze = (opts) => {
  const p = phantom(opts);
  return segment(p.data, p.w, p.h);
};
const baseline = analyze({}),
  identical = compare(baseline, analyze({})),
  changed = compare(baseline, analyze({ change: 1 })),
  shifted = compare(baseline, analyze({ dx: 12, dy: -8 })),
  rotated = compare(baseline, analyze({ angle: 0.25 })),
  lit = compare(baseline, analyze({ light: 40 }));
const checks = [];
function test(name, fn) {
  fn();
  checks.push(name);
  console.log("PASS", name);
}
test("identical images: no shape or color difference", () => {
  assert.equal(identical.shapeDifference, 0);
  assert.equal(identical.colorDistance, 0);
});
test("translation normalized: under 3% shape difference", () =>
  assert(shifted.shapeDifference < 3));
test("rotation normalized: under 6% shape difference", () =>
  assert(rotated.shapeDifference < 6));
test("shape perturbation exceeds unchanged pose controls", () => {
  assert(changed.shapeDifference > rotated.shapeDifference + 5);
  assert(changed.colorDistance > identical.colorDistance + 3);
});
test("lighting shift adds background warning", () => {
  assert(lit.backgroundDelta > 10);
  assert(lit.warnings.some((s) => s.includes("lighting")));
});
test("blank image rejected rather than analyzed", () => {
  const p = phantom();
  p.data.fill(160);
  for (let i = 3; i < p.data.length; i += 4) p.data[i] = 255;
  assert.throws(() => segment(p.data, p.w, p.h));
});
test("invalid seed rejected", () => {
  const p = phantom();
  assert.throws(() => segment(p.data, p.w, p.h, 0, { x: 0.01, y: 0.01 }));
});
test("darker simulated background segments (not a clinical fairness test)", () => {
  const a = analyze({ skin: [125, 86, 65] });
  assert(a.features.area > 2500 && a.features.area < 6000);
});
test("color conversion black and white", () => {
  assert(Math.abs(lab(0, 0, 0)[0]) < 0.01);
  assert(Math.abs(lab(255, 255, 255)[0] - 100) < 0.01);
});
const metrics = Object.fromEntries(
  Object.entries({ identical, changed, shifted, rotated, lit }).map(
    ([k, v]) => [
      k,
      {
        shapeDifference: v.shapeDifference,
        colorDistance: v.colorDistance,
        backgroundDelta: v.backgroundDelta,
      },
    ],
  ),
);
console.log(JSON.stringify({ checks: checks.length, metrics }, null, 2));
