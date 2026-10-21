export const RAY_PLOT = Object.freeze({
  sourceX: 150,
  lensX: 290,
  axisY: 188,
  scaleX: 140,
  scaleY: 860,
  bounds: Object.freeze({ xMin: 28, yMin: 36, xMax: 572, yMax: 332 }),
});

function formatSigned(value, fractionDigits) {
  const tolerance = 0.5 * 10 ** -fractionDigits;
  const normalized = Math.abs(value) < tolerance || Object.is(value, -0) ? 0 : value;
  const sign = normalized > 0 ? "+" : "";

  return `${sign}${normalized.toFixed(fractionDigits)}`;
}

function worldToScreen(x, y) {
  return [RAY_PLOT.sourceX + x * RAY_PLOT.scaleX, RAY_PLOT.axisY - y * RAY_PLOT.scaleY];
}

function clipSegment(x0, y0, x1, y1, bounds = RAY_PLOT.bounds) {
  let start = 0;
  let end = 1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const edges = [
    [-dx, x0 - bounds.xMin],
    [dx, bounds.xMax - x0],
    [-dy, y0 - bounds.yMin],
    [dy, bounds.yMax - y0],
  ];

  for (const [direction, distance] of edges) {
    if (Math.abs(direction) < 1e-9) {
      if (distance < 0) {
        return null;
      }
    } else {
      const intersection = distance / direction;

      if (direction < 0) {
        if (intersection > end) {
          return null;
        }
        if (intersection > start) {
          start = intersection;
        }
      } else if (intersection < start) {
        return null;
      } else if (intersection < end) {
        end = intersection;
      }
    }
  }

  return [x0 + start * dx, y0 + start * dy, x0 + end * dx, y0 + end * dy];
}

function pathFromSegment(segment) {
  if (!segment) {
    return "";
  }

  const [x0, y0, x1, y1] = segment.map((value) => Number(value.toFixed(2)));

  return `M${x0} ${y0}L${x1} ${y1}`;
}

function insidePlot(x, y) {
  const { bounds } = RAY_PLOT;

  return x >= bounds.xMin && x <= bounds.xMax && y >= bounds.yMin && y <= bounds.yMax;
}

function screenSegment(x0, y0, x1, y1) {
  const [sx0, sy0] = worldToScreen(x0, y0);
  const [sx1, sy1] = worldToScreen(x1, y1);

  return pathFromSegment(clipSegment(sx0, sy0, sx1, sy1));
}

function lensOutline(focalLengthM) {
  const [cx, cy] = worldToScreen(1, 0);
  const height = 112;

  if (Math.abs(focalLengthM) < 1e-9) {
    return {
      shape: "none",
      d: `M${cx - 6} ${cy - height}H${cx + 6}V${cy + height}H${cx - 6}Z`,
    };
  }

  if (focalLengthM > 0) {
    const bulge = 48;

    return {
      shape: "convex",
      d: `M${cx} ${cy - height} C${cx - bulge} ${cy - 72}, ${cx - bulge} ${cy + 72}, ${cx} ${cy + height} C${cx + bulge} ${cy + 72}, ${cx + bulge} ${cy - 72}, ${cx} ${cy - height}Z`,
    };
  }

  const rim = 22;
  const waist = 7;
  const top = cy - height;
  const bottom = cy + height;

  return {
    shape: "concave",
    d: `M${cx - rim} ${top} C${cx - waist} ${top + 34}, ${cx - waist} ${cy - 22}, ${cx - waist} ${cy} C${cx - waist} ${cy + 22}, ${cx - waist} ${bottom - 34}, ${cx - rim} ${bottom} L${cx + rim} ${bottom} C${cx + waist} ${bottom - 34}, ${cx + waist} ${cy + 22}, ${cx + waist} ${cy} C${cx + waist} ${cy - 22}, ${cx + waist} ${top + 34}, ${cx + rim} ${top}Z`,
  };
}

function focalTicks(focalLengthM) {
  const distance = Math.abs(focalLengthM);

  if (distance < 1e-9) {
    return [];
  }

  return [-2, -1, 1, 2]
    .map((multiple) => {
      const worldX = 1 + multiple * distance;
      const [x] = worldToScreen(worldX, 0);

      if (x < RAY_PLOT.bounds.xMin + 10 || x > RAY_PLOT.bounds.xMax - 10) {
        return null;
      }
      if (Math.abs(x - RAY_PLOT.lensX) < 16) {
        return null;
      }

      return {
        x,
        label: Math.abs(multiple) === 1 ? "F" : "2F",
        d: `M${x.toFixed(2)} ${RAY_PLOT.axisY - 7}V${RAY_PLOT.axisY + 7}`,
      };
    })
    .filter(Boolean);
}

function imageScreen(model) {
  if (!model.imageReal || model.imageXM === null) {
    return { screen: "", arrow: "", labelX: null };
  }

  const [planeX, planeY] = worldToScreen(model.imageXM, 0);

  if (planeX < RAY_PLOT.bounds.xMin + 16 || planeX > RAY_PLOT.bounds.xMax - 16) {
    return { screen: "", arrow: "", labelX: null };
  }

  const [tipX, tipY] = worldToScreen(model.imageXM, model.imageHeightM ?? 0);
  const top = RAY_PLOT.axisY - 78;
  const bottom = RAY_PLOT.axisY + 78;

  return {
    screen: `M${(planeX - 16).toFixed(2)} ${top}L${(planeX + 10).toFixed(2)} ${top + 16}L${(planeX + 22).toFixed(2)} ${bottom - 8}L${(planeX - 8).toFixed(2)} ${bottom}Z`,
    arrow: Math.abs(model.imageHeightM ?? 0) < 0.004 ? "" : `M${planeX.toFixed(2)} ${planeY.toFixed(2)}L${tipX.toFixed(2)} ${tipY.toFixed(2)}`,
    labelX: planeX,
  };
}

export function buildRayGraphics(model) {
  const [sourceX, sourceY] = worldToScreen(0, model.sourceHeightM);
  const [lensX, lensY] = worldToScreen(1, model.lensHeightM);
  const [baseX, baseY] = worldToScreen(0, 0);
  const incident = pathFromSegment(clipSegment(sourceX, sourceY, lensX, lensY));
  let outgoing = "";
  let extension = "";
  let intersection = null;
  const objectHeight = model.sourceHeightM;
  const parallelIncident = Math.abs(objectHeight) < 0.004 ? "" : screenSegment(0, objectHeight, 1, objectHeight);
  let parallelOutgoing = "";
  let parallelExtension = "";
  const center =
    Math.abs(objectHeight) < 0.004
      ? ""
      : screenSegment(0, objectHeight, 2.6, objectHeight + 1.6 * -objectHeight);

  if (Math.abs(model.focalLengthM) >= 1e-9 && Math.abs(objectHeight) >= 0.004) {
    const slope = -objectHeight / model.focalLengthM;
    const [farX, farY] = worldToScreen(3, objectHeight + 2 * slope);

    parallelOutgoing = pathFromSegment(clipSegment(RAY_PLOT.lensX, worldToScreen(1, objectHeight)[1], farX, farY));

    if (model.focalLengthM < 0) {
      const [focusX, focusY] = worldToScreen(1 + model.focalLengthM, 0);

      parallelExtension = pathFromSegment(
        clipSegment(RAY_PLOT.lensX, worldToScreen(1, objectHeight)[1], focusX, focusY),
      );
    }
  }

  if (model.outgoingAngleRad !== null && Math.abs(model.outgoingAngleRad) < Math.PI / 2 - 0.02) {
    const slope = Math.tan(model.outgoingAngleRad);
    const [farX, farY] = worldToScreen(3.2, model.lensHeightM + 2.2 * slope);

    outgoing = pathFromSegment(clipSegment(lensX, lensY, farX, farY));

    if (model.intersectionKind === "virtual" && model.intersectionXM !== null) {
      const [backX, backY] = worldToScreen(model.intersectionXM, 0);

      extension = pathFromSegment(clipSegment(lensX, lensY, backX, backY));
    }
  }

  if (model.intersectionXM !== null) {
    const [markX, markY] = worldToScreen(model.intersectionXM, 0);

    if (insidePlot(markX, markY)) {
      intersection = { cx: markX, cy: markY };
    }
  }

  const lens = lensOutline(model.focalLengthM);
  const ticks = focalTicks(model.focalLengthM);
  const formedImage = imageScreen(model);

  return {
    incident,
    outgoing,
    extension,
    parallelIncident,
    parallelOutgoing,
    parallelExtension,
    center,
    intersection,
    source: { cx: sourceX, cy: sourceY },
    objectArrow:
      Math.abs(objectHeight) < 0.004 ? "" : `M${baseX.toFixed(2)} ${baseY.toFixed(2)}L${sourceX.toFixed(2)} ${sourceY.toFixed(2)}`,
    objectLabel: { x: baseX, y: Math.min(sourceY, baseY) - 12 },
    lens,
    ticks,
    imageScreen: formedImage.screen,
    imageArrow: formedImage.arrow,
    imageLabelX: formedImage.labelX,
    beyondCanvas: model.intersectionXM !== null && intersection === null,
  };
}

export function renderRayDiagram(panel, model) {
  const graphics = buildRayGraphics(model);
  const values = {
    "focal-length": `${formatSigned(model.focalLengthM, 2)} m`,
    "launch-angle": `${formatSigned(model.launchAngleRad, 3)} rad`,
    "source-height": `${formatSigned(model.sourceHeightM, 3)} m`,
    "lens-height": `${formatSigned(model.lensHeightM, 3)} m`,
    "outgoing-angle":
      model.outgoingAngleRad === null ? "undefined" : `${formatSigned(model.outgoingAngleRad, 3)} rad`,
    intersection:
      model.intersectionXM === null ? "none" : `${formatSigned(model.intersectionXM, 2)} m`,
  };

  Object.entries(values).forEach(([name, value]) => {
    const output = panel.querySelector(`[data-ray-output="${name}"]`);

    if (output) {
      output.textContent = value;
    }
  });

  const setPath = (selector, path) => {
    const element = panel.querySelector(selector);

    if (!element) {
      return;
    }

    element.setAttribute("visibility", path ? "visible" : "hidden");
    if (path) {
      element.setAttribute("d", path);
    }
  };

  setPath('[data-ray-segment="incident"]', graphics.incident);
  setPath('[data-ray-segment="outgoing"]', graphics.outgoing);
  setPath('[data-ray-segment="extension"]', graphics.extension);
  setPath('[data-ray-segment="parallel-incident"]', graphics.parallelIncident);
  setPath('[data-ray-segment="parallel-outgoing"]', graphics.parallelOutgoing);
  setPath('[data-ray-segment="parallel-extension"]', graphics.parallelExtension);
  setPath('[data-ray-segment="center"]', graphics.center);
  setPath("[data-ray-lens]", graphics.lens.d);
  setPath("[data-ray-ticks]", graphics.ticks.map((tick) => tick.d).join(""));
  setPath("[data-ray-object]", graphics.objectArrow);
  setPath("[data-ray-image]", graphics.imageArrow);
  setPath("[data-ray-screen]", graphics.imageScreen);

  const lens = panel.querySelector("[data-ray-lens]");

  if (lens) {
    lens.dataset.lensShape = graphics.lens.shape;
  }

  for (let index = 0; index < 4; index += 1) {
    const label = panel.querySelector(`[data-ray-tick="${index}"]`);
    const tick = graphics.ticks[index];

    if (!label) {
      continue;
    }

    label.setAttribute("visibility", tick ? "visible" : "hidden");
    label.textContent = tick?.label ?? "";
    if (tick) {
      label.setAttribute("x", tick.x.toFixed(2));
      label.setAttribute("y", String(RAY_PLOT.axisY + 20));
    }
  }

  const objectLabel = panel.querySelector("[data-ray-object-label]");

  if (objectLabel) {
    objectLabel.setAttribute("visibility", graphics.objectArrow ? "visible" : "hidden");
    objectLabel.setAttribute("x", graphics.objectLabel.x.toFixed(2));
    objectLabel.setAttribute("y", graphics.objectLabel.y.toFixed(2));
  }

  const imageLabel = panel.querySelector("[data-ray-image-label]");

  if (imageLabel) {
    imageLabel.setAttribute("visibility", graphics.imageLabelX === null ? "hidden" : "visible");
    if (graphics.imageLabelX !== null) {
      imageLabel.setAttribute("x", graphics.imageLabelX.toFixed(2));
      imageLabel.setAttribute("y", String(RAY_PLOT.bounds.yMax - 6));
    }
  }

  const mark = panel.querySelector("[data-ray-intersection]");

  if (mark) {
    mark.setAttribute("visibility", graphics.intersection ? "visible" : "hidden");
    if (graphics.intersection) {
      mark.setAttribute("cx", graphics.intersection.cx.toFixed(2));
      mark.setAttribute("cy", graphics.intersection.cy.toFixed(2));
    }
  }

  const status = panel.querySelector("[data-ray-status]");

  if (status) {
    const canvasNote = graphics.beyondCanvas ? " The intersection lies outside the canvas." : "";
    const validityNote = model.paraxialValid
      ? ""
      : " The current angle is outside the paraxial validity range.";

    status.textContent = `${model.status}${canvasNote}${validityNote}`;
  }

  panel.dataset.paraxial = model.paraxialValid ? "valid" : "exceeded";
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
