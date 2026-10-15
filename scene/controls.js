export function bindSceneControls(scene) {
  const motionToggle = scene.querySelector(".motion-toggle");
  const motionLabel = scene.querySelector(".motion-label");

  if (!motionToggle || !motionLabel) {
    return;
  }

  motionToggle.addEventListener("click", () => {
    const isPaused = scene.classList.toggle("motion-paused");

    motionToggle.setAttribute("aria-pressed", String(isPaused));
    motionLabel.textContent = isPaused ? "Resume light motion" : "Pause light motion";
  });
}
