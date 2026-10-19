import { calculatePreset, calculateRay } from "./optics/calculations.js";
import { bindOpticsControls, bindRayControls } from "./optics/controls.js";
import { renderOpticsState, renderRayDiagram } from "./optics/display.js";
import { calculateSceneGeometry } from "./scene/calculations.js";
import { bindSceneControls } from "./scene/controls.js";
import { renderSceneGeometry } from "./scene/display.js";

const scene = document.querySelector(".scene-shell");
const lensPanel = document.querySelector(".lens-panel");
const raySimulator = document.querySelector(".ray-simulator");

if (scene) {
  const geometry = calculateSceneGeometry();

  renderSceneGeometry(scene, geometry);
  bindSceneControls(scene);
}

if (lensPanel) {
  bindOpticsControls(lensPanel, (presetId) => {
    renderOpticsState(document, calculatePreset(presetId));
  });
}

if (raySimulator) {
  bindRayControls(raySimulator, (rayInput) => {
    renderRayDiagram(raySimulator, calculateRay(rayInput));
  });
}
