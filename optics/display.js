function formatSigned(value, fractionDigits) {
  const normalized = Object.is(value, -0) ? 0 : value;
  const sign = normalized > 0 ? "+" : "";

  return `${sign}${normalized.toFixed(fractionDigits)}`;
}

export function renderOpticsState(root, model) {
  const chart = root.querySelector(".optics-target");
  const outputs = {
    preset: model.label,
    "object-distance": `${formatSigned(model.objectDistanceM, 2)} m`,
    "image-distance": `${formatSigned(model.imageDistanceM * 1000, 1)} mm`,
    "focal-length": `${formatSigned(model.focalLengthM * 1000, 1)} mm`,
    defocus: `${formatSigned(model.imageOffsetM * 1000, 1)} mm`,
  };

  Object.entries(outputs).forEach(([name, value]) => {
    const output = root.querySelector(`[data-output="${name}"]`);

    if (output) {
      output.textContent = value;
    }
  });

  if (chart) {
    chart.style.setProperty("--chart-blur", `${model.blurPx}px`);
    chart.style.setProperty("--chart-shift", `${model.chartShiftPx}px`);
    chart.style.setProperty("--chart-opacity", String(model.chartOpacity));
    chart.setAttribute(
      "aria-label",
      `Distance vision-test board shown with the ${model.label} clarity preset`,
    );
  }
}
