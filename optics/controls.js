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
