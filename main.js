import { calculateSceneGeometry } from "./scene/calculations.js";
import { bindSceneControls } from "./scene/controls.js";
import { renderSceneGeometry } from "./scene/display.js";

const scene = document.querySelector(".scene-shell");

if (scene) {
  const geometry = calculateSceneGeometry();

  renderSceneGeometry(scene, geometry);
  bindSceneControls(scene);
}
