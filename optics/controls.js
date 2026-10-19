import { RAY_DEFAULTS, normalizeRayInput } from "./calculations.js";

export function readRayControlValues(controls) {
  return normalizeRayInput({
    focalLengthM: controls.focalLength.value,
    launchAngleRad: controls.launchAngle.value,
    sourceHeightM: controls.sourceHeight.value,
  });
}

export function applyRayDefaults(controls) {
  controls.focalLength.value = String(RAY_DEFAULTS.focalLengthM);
  controls.launchAngle.value = String(RAY_DEFAULTS.launchAngleRad);
  controls.sourceHeight.value = String(RAY_DEFAULTS.sourceHeightM);

  return readRayControlValues(controls);
}

export function bindRayControls(panel, onChange) {
  const controls = {
    focalLength: panel.querySelector("#ray-focal-length"),
    launchAngle: panel.querySelector("#ray-launch-angle"),
    sourceHeight: panel.querySelector("#ray-source-height"),
  };
  const reset = panel.querySelector(".ray-reset");

  if (!controls.focalLength || !controls.launchAngle || !controls.sourceHeight) {
    return () => {};
  }

  const update = () => onChange(readRayControlValues(controls));

  controls.focalLength.addEventListener("input", update);
  controls.launchAngle.addEventListener("input", update);
  controls.sourceHeight.addEventListener("input", update);
  reset?.addEventListener("click", () => {
    applyRayDefaults(controls);
    update();
  });
  update();

  return () => {
    controls.focalLength.removeEventListener("input", update);
    controls.launchAngle.removeEventListener("input", update);
    controls.sourceHeight.removeEventListener("input", update);
  };
}

export function bindOpticsControls(panel, onPresetChange) {
  const controls = [...panel.querySelectorAll('input[name="lens-preset"]')];

  if (controls.length === 0) {
    return () => {};
  }

  const handleChange = (event) => {
    if (event.target.checked) {
      onPresetChange(event.target.value);
    }
  };

  controls.forEach((control) => control.addEventListener("change", handleChange));

  const initialControl = controls.find(({ checked }) => checked) ?? controls[0];
  initialControl.checked = true;
  onPresetChange(initialControl.value);

  return () => {
    controls.forEach((control) => control.removeEventListener("change", handleChange));
  };
}
