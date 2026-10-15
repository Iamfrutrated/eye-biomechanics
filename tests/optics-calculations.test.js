import assert from "node:assert/strict";
import test from "node:test";

import {
  IMAGE_DISTANCE_STEP_M,
  LENS_PRESETS,
  OBJECT_DISTANCE_M,
  REFERENCE_IMAGE_DISTANCE_M,
  calculateFocalLength,
  calculatePreset,
} from "../optics/calculations.js";

test("thin-lens calculation satisfies the declared equation", () => {
  const imageDistanceM = REFERENCE_IMAGE_DISTANCE_M;
  const focalLengthM = calculateFocalLength(OBJECT_DISTANCE_M, imageDistanceM);

  assert.ok(
    Math.abs(1 / focalLengthM - (1 / OBJECT_DISTANCE_M + 1 / imageDistanceM)) <
      Number.EPSILON * 100,
  );
});

test("preset spectrum contains the seven ordered choices", () => {
  assert.deepEqual(
    LENS_PRESETS.map(({ id }) => id),
    [
      "farsighted-3",
      "farsighted-2",
      "farsighted-1",
      "neutral",
      "nearsighted-1",
      "nearsighted-2",
      "nearsighted-3",
    ],
  );
});

test("preset levels scale image distance around the neutral plane", () => {
  const neutral = calculatePreset("neutral");
  const farsightedThree = calculatePreset("farsighted-3");
  const nearsightedThree = calculatePreset("nearsighted-3");

  assert.equal(neutral.imageDistanceM, REFERENCE_IMAGE_DISTANCE_M);
  assert.ok(
    Math.abs(
      farsightedThree.imageDistanceM -
        (REFERENCE_IMAGE_DISTANCE_M + 3 * IMAGE_DISTANCE_STEP_M),
    ) < 1e-12,
  );
  assert.ok(
    Math.abs(
      nearsightedThree.imageDistanceM -
        (REFERENCE_IMAGE_DISTANCE_M - 3 * IMAGE_DISTANCE_STEP_M),
    ) < 1e-12,
  );
  assert.equal(farsightedThree.blurPx, nearsightedThree.blurPx);
  assert.ok(farsightedThree.chartShiftPx > 0);
  assert.ok(nearsightedThree.chartShiftPx < 0);
});

test("clarity effect increases with preset severity", () => {
  assert.equal(calculatePreset("neutral").blurPx, 0);
  assert.ok(calculatePreset("farsighted-2").blurPx > calculatePreset("farsighted-1").blurPx);
  assert.ok(calculatePreset("nearsighted-3").blurPx > calculatePreset("nearsighted-2").blurPx);
});

test("invalid distances and preset ids are rejected", () => {
  assert.throws(() => calculateFocalLength(0, 0.024), RangeError);
  assert.throws(() => calculateFocalLength(6, Number.NaN), RangeError);
  assert.throws(() => calculatePreset("unknown"), RangeError);
});
