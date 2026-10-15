export function renderSceneGeometry(scene, geometry) {
  Object.entries(geometry.beams).forEach(([name, path]) => {
    const beam = scene.querySelector(`[data-beam="${name}"]`);

    if (beam) {
      beam.setAttribute("d", path);
    }
  });
}
