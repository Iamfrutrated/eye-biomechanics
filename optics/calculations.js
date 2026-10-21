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

export const RAY_DEFAULTS = Object.freeze({
  focalLengthM: 0.45,
  launchAngleRad: 0,
  sourceHeightM: 0.06,
});

export const RAY_LIMITS = Object.freeze({
  minFocalLengthM: -1,
  maxFocalLengthM: 1,
  minLaunchAngleRad: -Math.PI / 3,
  maxLaunchAngleRad: Math.PI / 3,
  minSourceHeightM: -0.2,
  maxSourceHeightM: 0.2,
  paraxialLimitRad: 0.175,
  lensXM: 1,
  apertureHalfHeightM: 0.26,
});

function finiteValue(value, label) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    throw new RangeError(`${label} must be a finite number.`);
  }

  return numeric;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * +x points from the source toward the lens and +y points up.
 * Angles are measured counterclockwise from +x.
 * At the lens, θ_out = θ_in − y/f. Distances are metres and angles are radians.
 * f > 0 converges; f < 0 diverges. The geometric path uses tan(θ), while the
 * transfer itself remains the paraxial relation even when the selected angle is not.
 */
export function normalizeRayInput(input) {
  const focalLengthM = clamp(
    finiteValue(input.focalLengthM, "Focal length"),
    RAY_LIMITS.minFocalLengthM,
    RAY_LIMITS.maxFocalLengthM,
  );
  const launchAngleRad = clamp(
    finiteValue(input.launchAngleRad, "Launch angle"),
    RAY_LIMITS.minLaunchAngleRad,
    RAY_LIMITS.maxLaunchAngleRad,
  );
  const sourceHeightM = clamp(
    finiteValue(input.sourceHeightM, "Source height"),
    RAY_LIMITS.minSourceHeightM,
    RAY_LIMITS.maxSourceHeightM,
  );

  return { focalLengthM, launchAngleRad, sourceHeightM };
}

export function calculateRay(input) {
  const values = normalizeRayInput(input);
  const { focalLengthM, launchAngleRad, sourceHeightM } = values;
  const lensHeightM = sourceHeightM + RAY_LIMITS.lensXM * Math.tan(launchAngleRad);
  const missesAperture = Math.abs(lensHeightM) > RAY_LIMITS.apertureHalfHeightM;
  const transferDefined = Math.abs(focalLengthM) >= 1e-9;
  let outgoingAngleRad = null;
  let intersectionKind = "undefined";
  let intersectionXM = null;
  let status = "Focal length is zero, so the lens transfer is undefined.";

  if (!transferDefined) {
    status = "Focal length is zero, so the lens transfer is undefined.";
  } else if (missesAperture) {
    outgoingAngleRad = launchAngleRad;
    status = "The ray misses the lens aperture and continues straight.";
  } else {
    outgoingAngleRad = launchAngleRad - lensHeightM / focalLengthM;
    status = "The ray reaches the lens.";
  }

  const forwardRay =
    outgoingAngleRad !== null && Math.abs(outgoingAngleRad) < Math.PI / 2 - 0.02;

  if (outgoingAngleRad !== null && !forwardRay) {
    intersectionKind = "undefined";
    status = "The outgoing angle is too steep to draw as a forward ray.";
  } else if (forwardRay) {
    const slope = Math.tan(outgoingAngleRad);

    if (Math.abs(slope) < 1e-4) {
      intersectionKind = "parallel";
      status = missesAperture
        ? "The missed ray continues parallel to the optical axis."
        : "The outgoing ray is parallel to the optical axis.";
    } else {
      intersectionXM = RAY_LIMITS.lensXM + (0 - lensHeightM) / slope;
      intersectionKind = intersectionXM < RAY_LIMITS.lensXM ? "virtual" : "real";
      status =
        intersectionKind === "virtual"
          ? "The axis intersection is virtual, on the source side of the lens."
          : "The ray crosses the optical axis after the lens.";
    }
  }

  const paraxialValid =
    Math.abs(launchAngleRad) <= RAY_LIMITS.paraxialLimitRad &&
    (outgoingAngleRad === null || Math.abs(outgoingAngleRad) <= RAY_LIMITS.paraxialLimitRad);
  const image = imageOfObject(focalLengthM, sourceHeightM);

  return Object.freeze({
    ...values,
    lensHeightM,
    outgoingAngleRad,
    intersectionXM,
    intersectionKind,
    missesAperture,
    paraxialValid,
    ...image,
    status,
  });
}

/**
 * Object distance is the fixed source-to-lens distance. Image distance follows
 * 1/f = 1/d_o + 1/d_i. A positive d_i is a real image beyond the lens.
 * Magnification is −d_i/d_o. This remains the thin-lens result; lens thickness
 * in the diagram is only a drawing.
 */
function imageOfObject(focalLengthM, objectHeightM) {
  const empty = {
    imageDistanceM: null,
    imageXM: null,
    imageHeightM: null,
    imageReal: false,
  };

  if (Math.abs(focalLengthM) < 1e-9) {
    return empty;
  }

  const denominator = 1 / focalLengthM - 1 / RAY_LIMITS.lensXM;

  if (Math.abs(denominator) < 1e-6) {
    return empty;
  }

  const imageDistanceM = 1 / denominator;

  return {
    imageDistanceM,
    imageXM: RAY_LIMITS.lensXM + imageDistanceM,
    imageHeightM: (-imageDistanceM / RAY_LIMITS.lensXM) * objectHeightM,
    imageReal: imageDistanceM > 0.02,
  };
}
