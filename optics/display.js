export const RAY_PLOT = Object.freeze({
  sourceX: 78,
  lensX: 382,
  axisY: 195,
  scaleX: 304,
  scaleY: 520,
  bounds: Object.freeze({ xMin: 36, yMin: 40, xMax: 564, yMax: 350 }),
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

export function buildRayGraphics(model) {
  const [sourceX, sourceY] = worldToScreen(0, model.sourceHeightM);
  const [lensX, lensY] = worldToScreen(1, model.lensHeightM);
  const incident = pathFromSegment(clipSegment(sourceX, sourceY, lensX, lensY));
  let outgoing = "";
  let extension = "";
  let intersection = null;

  if (model.outgoingAngleRad !== null && Math.abs(model.outgoingAngleRad) < Math.PI / 2 - 0.02) {
    const slope = Math.tan(model.outgoingAngleRad);
    const [farX, farY] = worldToScreen(3, model.lensHeightM + 2 * slope);

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

  const guideFor = (focalX) => {
    const [x] = worldToScreen(focalX, 0);

    if (x < 50 || x > 550 || Math.abs(x - RAY_PLOT.lensX) < 16) {
      return null;
    }

    return { d: `M${x.toFixed(2)} 68V322`, x };
  };
  const guides = [guideFor(1 - model.focalLengthM), guideFor(1 + model.focalLengthM)]
    .filter(Boolean)
    .sort((first, second) => first.x - second.x);

  return {
    incident,
    outgoing,
    extension,
    intersection,
    source: { cx: sourceX, cy: sourceY },
    guides: {
      left: guides[0] ?? null,
      right: guides[1] ?? null,
    },
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
  setPath('[data-ray-guide="left"]', graphics.guides.left?.d ?? "");
  setPath('[data-ray-guide="right"]', graphics.guides.right?.d ?? "");
  ["left", "right"].forEach((side) => {
    const label = panel.querySelector(`[data-ray-guide-label="${side}"]`);
    const guide = graphics.guides[side];

    if (!label) {
      return;
    }

    label.setAttribute("visibility", guide ? "visible" : "hidden");
    if (guide) {
      label.setAttribute("x", guide.x.toFixed(2));
      label.setAttribute("y", "84");
    }
  });

  const source = panel.querySelector("[data-ray-source-point]");
  const stem = panel.querySelector("[data-ray-source-stem]");
  const cap = panel.querySelector("[data-ray-source-cap]");

  if (source && stem && cap) {
    source.setAttribute("cx", graphics.source.cx.toFixed(2));
    source.setAttribute("cy", graphics.source.cy.toFixed(2));
    stem.setAttribute("d", `M${graphics.source.cx.toFixed(2)} ${RAY_PLOT.axisY}V${graphics.source.cy.toFixed(2)}`);
    cap.setAttribute(
      "d",
      `M${graphics.source.cx.toFixed(2)} ${graphics.source.cy.toFixed(2)}l${(
        16 * Math.cos(model.launchAngleRad)
      ).toFixed(2)} ${(-16 * Math.sin(model.launchAngleRad)).toFixed(2)}`,
    );
  }

  const mark = panel.querySelector("[data-ray-intersection]");

  if (mark) {
    mark.setAttribute("visibility", graphics.intersection ? "visible" : "hidden");
    if (graphics.intersection) {
      mark.setAttribute("cx", graphics.intersection.cx.toFixed(2));
      mark.setAttribute("cy", graphics.intersection.cy.toFixed(2));
    }
  }

  const lensArrows = panel.querySelector(".lens-arrows");

  if (lensArrows) {
    lensArrows.setAttribute(
      "d",
      model.focalLengthM >= 0
        ? "M370 70L382 52L394 70M370 320L382 338L394 320"
        : "M370 52L382 70L394 52M370 338L382 320L394 338",
    );
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
