import { calculatePreset } from "./optics/calculations.js";
import { bindOpticsControls } from "./optics/controls.js";
import { renderOpticsState } from "./optics/display.js";
import { calculateSceneGeometry } from "./scene/calculations.js";
import { bindSceneControls } from "./scene/controls.js";
import { renderSceneGeometry } from "./scene/display.js";

const scene = document.querySelector(".scene-shell");
const lensPanel = document.querySelector(".lens-panel");

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
