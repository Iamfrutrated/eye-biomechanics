export const OBJECT_DISTANCE_M = 6;
export const REFERENCE_IMAGE_DISTANCE_M = 0.024;
export const IMAGE_DISTANCE_STEP_M = 0.0006;

export const LENS_PRESETS = Object.freeze(
  [
    ["farsighted-3", "Farsighted 3", 3],
    ["farsighted-2", "Farsighted 2", 2],
    ["farsighted-1", "Farsighted 1", 1],
    ["neutral", "Neutral", 0],
    ["nearsighted-1", "Nearsighted 1", -1],
    ["nearsighted-2", "Nearsighted 2", -2],
    ["nearsighted-3", "Nearsighted 3", -3],
  ].map(([id, label, level]) => Object.freeze({ id, label, level })),
);

/**
 * Uses the real-is-positive convention:
 * 1/f = 1/d_o + 1/d_i
 * d_o > 0 for a real object in front of the thin lens.
 * d_i > 0 for a real image beyond the thin lens.
 * Inputs and output are in metres.
 */
export function calculateFocalLength(objectDistanceM, imageDistanceM) {
  if (
    !Number.isFinite(objectDistanceM) ||
    !Number.isFinite(imageDistanceM) ||
    objectDistanceM <= 0 ||
    imageDistanceM <= 0
  ) {
    throw new RangeError("Object and image distances must be positive finite values.");
  }

  return 1 / (1 / objectDistanceM + 1 / imageDistanceM);
}

export function calculatePreset(presetId) {
  const preset = LENS_PRESETS.find(({ id }) => id === presetId);

  if (!preset) {
    throw new RangeError(`Unknown lens preset: ${presetId}`);
  }

  const imageDistanceM = REFERENCE_IMAGE_DISTANCE_M + preset.level * IMAGE_DISTANCE_STEP_M;
  const imageOffsetM = imageDistanceM - REFERENCE_IMAGE_DISTANCE_M;
  const focalLengthM = calculateFocalLength(OBJECT_DISTANCE_M, imageDistanceM);
  const severity = Math.abs(preset.level);

  return Object.freeze({
    ...preset,
    objectDistanceM: OBJECT_DISTANCE_M,
    imageDistanceM,
    focalLengthM,
    imageOffsetM,
    blurPx: severity * 0.8,
    chartShiftPx: preset.level * 0.45,
    chartOpacity: 1 - severity * 0.055,
  });
}
