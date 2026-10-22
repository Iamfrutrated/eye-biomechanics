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

export const RAY_ZOOM = Object.freeze({ min: 0.4, max: 4.5 });

export function zoomView(view, svgX, svgY, deltaY) {
  const factor = deltaY > 0 ? 1 / 1.12 : 1.12;
  const scale = Math.min(RAY_ZOOM.max, Math.max(RAY_ZOOM.min, view.scale * factor));
  const ratio = scale / view.scale;

  return {
    scale,
    x: svgX - (svgX - view.x) * ratio,
    y: svgY - (svgY - view.y) * ratio,
  };
}

export function panView(view, dx, dy) {
  return { scale: view.scale, x: view.x + dx, y: view.y + dy };
}

export function bindRayViewport(svg) {
  const scene = svg.querySelector("[data-ray-scene]");

  if (!scene) {
    return () => {};
  }

  let view = { scale: 1, x: 0, y: 0 };
  let drag = null;

  const apply = () => {
    scene.setAttribute("transform", `translate(${view.x} ${view.y}) scale(${view.scale})`);
  };
  const svgPoint = (event) => {
    const matrix = svg.getScreenCTM();

    if (!matrix) {
      return { x: 0, y: 0 };
    }

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());

    return { x: local.x, y: local.y };
  };
  const onWheel = (event) => {
    event.preventDefault();
    const point = svgPoint(event);
    view = zoomView(view, point.x, point.y, event.deltaY);
    apply();
  };
  const onPointerDown = (event) => {
    if (event.button !== 0) {
      return;
    }

    svg.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    svg.classList.add("is-panning");
  };
  const onPointerMove = (event) => {
    if (!drag || event.pointerId !== drag.id) {
      return;
    }

    const matrix = svg.getScreenCTM();
    const dx = matrix ? (event.clientX - drag.x) / matrix.a : 0;
    const dy = matrix ? (event.clientY - drag.y) / matrix.d : 0;

    view = panView(view, dx, dy);
    drag = { id: drag.id, x: event.clientX, y: event.clientY };
    apply();
  };
  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.id) {
      return;
    }

    drag = null;
    svg.classList.remove("is-panning");
  };

  svg.addEventListener("wheel", onWheel, { passive: false });
  svg.addEventListener("pointerdown", onPointerDown);
  svg.addEventListener("pointermove", onPointerMove);
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);
  apply();

  return () => {
    svg.removeEventListener("wheel", onWheel);
    svg.removeEventListener("pointerdown", onPointerDown);
    svg.removeEventListener("pointermove", onPointerMove);
    svg.removeEventListener("pointerup", endDrag);
    svg.removeEventListener("pointercancel", endDrag);
  };
}

export function bindRayControls(panel, onChange) {
  const controls = {
    focalLength: panel.querySelector("#ray-focal-length"),
    launchAngle: panel.querySelector("#ray-launch-angle"),
    sourceHeight: panel.querySelector("#ray-source-height"),
  };
  const reset = panel.querySelector(".ray-reset");
  const canvas = panel.querySelector(".ray-canvas");

  if (canvas) {
    bindRayViewport(canvas);
  }

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
