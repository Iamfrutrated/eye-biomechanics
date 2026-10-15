const scene = document.querySelector(".scene-shell");
const motionToggle = document.querySelector(".motion-toggle");
const motionLabel = document.querySelector(".motion-label");

motionToggle.addEventListener("click", () => {
  const isPaused = scene.classList.toggle("motion-paused");

  motionToggle.setAttribute("aria-pressed", String(isPaused));
  motionLabel.textContent = isPaused ? "Resume light motion" : "Pause light motion";
});
