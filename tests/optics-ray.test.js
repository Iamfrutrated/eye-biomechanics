import assert from "node:assert/strict";
import test from "node:test";

import {
  RAY_DEFAULTS,
  RAY_LIMITS,
  calculateRay,
  constructionImage,
  indirectSlope,
  objectSideFocalX,
} from "../optics/calculations.js";
import { applyRayDefaults, readRayControlValues, zoomView } from "../optics/controls.js";
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

test("aimed rays stay inside the lens across the source-height range", () => {
  for (const sourceHeightM of [RAY_LIMITS.minSourceHeightM, RAY_LIMITS.maxSourceHeightM]) {
    for (const launchAngleRad of [RAY_LIMITS.minLaunchAngleRad, RAY_LIMITS.maxLaunchAngleRad]) {
      const ray = calculateRay({ ...RAY_DEFAULTS, sourceHeightM, launchAngleRad });

      assert.ok(Math.abs(ray.lensHeightM) < RAY_LIMITS.apertureHalfHeightM * 0.8);
      assert.equal(ray.missesAperture, false);
    }
  }
});

test("the indirect ray goes straight through F and the image is the ray crossing", () => {
  const convex = calculateRay(RAY_DEFAULTS);
  const graphics = buildRayGraphics(convex);
  const focalX = objectSideFocalX(convex.focalLengthM);
  const slope = indirectSlope(convex.sourceHeightM, convex.focalLengthM);
  const crossing = constructionImage(convex);
  const denominator = 1 / RAY_DEFAULTS.focalLengthM - 1 / RAY_LIMITS.lensXM;

  assert.ok(Math.abs(convex.sourceHeightM + slope * focalX) < 1e-12);
  assert.equal(graphics.lens.shape, "convex");
  assert.match(graphics.indirect, /^M/);
  assert.equal(graphics.parallelIncident, undefined);
  assert.equal(graphics.center, undefined);
  assert.ok(Math.abs(convex.constructionXM - crossing.constructionXM) < 1e-12);
  assert.ok(Math.abs(convex.constructionYM - crossing.constructionYM) < 1e-12);
  assert.match(graphics.imageArrow, /^M/);
  assert.equal(graphics.imageScreen, undefined);
  assert.ok(Math.abs(1 / convex.imageDistanceM - denominator) < 1e-9);
  assert.ok(convexGraphicsHasNoScreen(graphics));
});

function convexGraphicsHasNoScreen(graphics) {
  return graphics.imageScreen === undefined && !("imageScreen" in graphics && graphics.imageScreen);
}

test("concave and convex lenses use the same thin-lens bend with opposite signs", () => {
  const concave = calculateRay({ focalLengthM: -0.45, launchAngleRad: 0.03, sourceHeightM: 0.1 });
  const graphics = buildRayGraphics(concave);

  assert.equal(graphics.lens.shape, "concave");
  assert.ok(concave.outgoingAngleRad > 0);
  assert.match(graphics.indirect, /^M/);
  assert.match(graphics.incident, /^M/);
});

test("a diverging lens sends the default-height ray to a virtual intersection", () => {
  const ray = calculateRay({ focalLengthM: -0.45, launchAngleRad: 0, sourceHeightM: 0.12 });

  assert.ok(ray.outgoingAngleRad > 0);
  assert.equal(ray.intersectionKind, "virtual");
  assert.ok(ray.intersectionXM < RAY_LIMITS.lensXM);
  assert.match(buildRayGraphics(ray).extension, /^M/);
});

test("wheel zoom keeps the pointer fixed and can zoom out", () => {
  const start = { scale: 1, x: 0, y: 0 };
  const zoomedOut = zoomView(start, 100, 50, 120);
  const zoomedIn = zoomView(start, 100, 50, -120);

  assert.ok(zoomedOut.scale < start.scale);
  assert.ok(zoomedIn.scale > start.scale);
  assert.ok(Math.abs(100 - (100 - zoomedOut.x) / zoomedOut.scale) < 1e-9);
  assert.ok(Math.abs(50 - (50 - zoomedOut.y) / zoomedOut.scale) < 1e-9);
});

test("non-numeric ray controls are rejected", () => {
  assert.throws(
    () => calculateRay({ focalLengthM: "wide", launchAngleRad: 0, sourceHeightM: 0 }),
    RangeError,
  );
});
