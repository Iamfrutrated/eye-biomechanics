import assert from "node:assert/strict";
import test from "node:test";

import { RAY_DEFAULTS, RAY_LIMITS, calculateRay } from "../optics/calculations.js";
import { applyRayDefaults, readRayControlValues } from "../optics/controls.js";
import { buildRayGraphics } from "../optics/display.js";

test("paraxial transfer determines the default outgoing ray", () => {
  const ray = calculateRay(RAY_DEFAULTS);
  const expectedAngle = RAY_DEFAULTS.launchAngleRad - ray.lensHeightM / RAY_DEFAULTS.focalLengthM;

  assert.equal(ray.lensHeightM, RAY_DEFAULTS.sourceHeightM);
  assert.ok(Math.abs(ray.outgoingAngleRad - expectedAngle) < 1e-12);
  assert.equal(ray.intersectionKind, "real");
  assert.equal(ray.paraxialValid, true);
  assert.match(buildRayGraphics(ray).incident, /^M/);
  assert.match(buildRayGraphics(ray).outgoing, /^M/);
  assert.ok(buildRayGraphics(ray).intersection);
});

test("controls clamp extreme values and restore defaults", () => {
  const controls = {
    focalLength: { value: "9" },
    launchAngle: { value: String(Math.PI) },
    sourceHeight: { value: "-4" },
  };
  const clamped = readRayControlValues(controls);

  assert.deepEqual(clamped, {
    focalLengthM: RAY_LIMITS.maxFocalLengthM,
    launchAngleRad: RAY_LIMITS.maxLaunchAngleRad,
    sourceHeightM: RAY_LIMITS.minSourceHeightM,
  });
  assert.deepEqual(applyRayDefaults(controls), RAY_DEFAULTS);
  assert.equal(controls.launchAngle.value, String(RAY_DEFAULTS.launchAngleRad));
});

test("zero focal length, parallel rays, and steep output stay finite", () => {
  const zeroLens = calculateRay({ ...RAY_DEFAULTS, focalLengthM: 0 });
  const parallel = calculateRay({ focalLengthM: 0.5, launchAngleRad: 0, sourceHeightM: 0 });
  const steep = calculateRay({ focalLengthM: 0.01, launchAngleRad: 0, sourceHeightM: 0.2 });

  assert.equal(zeroLens.outgoingAngleRad, null);
  assert.equal(zeroLens.intersectionKind, "undefined");
  assert.equal(parallel.intersectionKind, "parallel");
  assert.equal(parallel.intersectionXM, null);
  assert.equal(steep.intersectionKind, "undefined");
  assert.equal(buildRayGraphics(steep).outgoing, "");
});

test("full-range angle remains drawable while marked outside paraxial validity", () => {
  const ray = calculateRay({
    focalLengthM: -0.45,
    launchAngleRad: -Math.PI / 3,
    sourceHeightM: -0.2,
  });
  const graphics = buildRayGraphics(ray);

  assert.equal(ray.launchAngleRad, -Math.PI / 3);
  assert.equal(ray.paraxialValid, false);
  assert.equal(ray.missesAperture, true);
  assert.equal(typeof graphics.incident, "string");
  assert.equal(typeof graphics.outgoing, "string");
});

test("shaped lens, focal ticks, and real image follow the thin-lens drawing", () => {
  const convex = calculateRay(RAY_DEFAULTS);
  const convexGraphics = buildRayGraphics(convex);
  const concave = calculateRay({ focalLengthM: -0.45, launchAngleRad: 0, sourceHeightM: 0.12 });
  const concaveGraphics = buildRayGraphics(concave);
  const denominator = 1 / RAY_DEFAULTS.focalLengthM - 1 / RAY_LIMITS.lensXM;

  assert.equal(convexGraphics.lens.shape, "convex");
  assert.match(convexGraphics.lens.d, /C/);
  assert.equal(concaveGraphics.lens.shape, "concave");
  assert.ok(convex.imageReal);
  assert.ok(Math.abs(1 / convex.imageDistanceM - denominator) < 1e-9);
  assert.equal(concave.imageReal, false);
  assert.ok(convexGraphics.ticks.some((tick) => tick.label === "F"));
  assert.ok(convexGraphics.ticks.some((tick) => tick.label === "2F"));
  assert.match(convexGraphics.objectArrow, /^M/);
  assert.match(convexGraphics.imageArrow, /^M/);
  assert.match(convexGraphics.imageScreen, /^M/);
  assert.equal(concaveGraphics.imageArrow, "");
});

test("a diverging lens sends the default-height ray to a virtual intersection", () => {
  const ray = calculateRay({ focalLengthM: -0.45, launchAngleRad: 0, sourceHeightM: 0.12 });

  assert.ok(ray.outgoingAngleRad > 0);
  assert.equal(ray.intersectionKind, "virtual");
  assert.ok(ray.intersectionXM < RAY_LIMITS.lensXM);
  assert.match(buildRayGraphics(ray).extension, /^M/);
});

test("non-numeric ray controls are rejected", () => {
  assert.throws(
    () => calculateRay({ focalLengthM: "wide", launchAngleRad: 0, sourceHeightM: 0 }),
    RangeError,
  );
});
