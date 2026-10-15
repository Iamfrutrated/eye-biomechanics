const DEFAULT_VIEW_BOX = Object.freeze({
  width: 1440,
  height: 850,
});

function toPath(points) {
  return `${points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`)
    .join("")}Z`;
}

/**
 * Returns screen-space polygons for illumination entering from outside the
 * visible room. This is presentation geometry only; it does not model optics
 * or make assumptions about the viewer.
 */
export function calculateSceneGeometry(viewBox = DEFAULT_VIEW_BOX) {
  const { width, height } = viewBox;

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new RangeError("Scene dimensions must be positive finite numbers.");
  }

  return {
    beams: {
      left: toPath([
        [-0.08 * width, 0.14 * height],
        [0.02 * width, 0.12 * height],
        [0.47 * width, height],
        [0.08 * width, height],
      ]),
      right: toPath([
        [0.98 * width, 0.11 * height],
        [1.08 * width, 0.16 * height],
        [0.92 * width, height],
        [0.53 * width, height],
      ]),
    },
  };
}
