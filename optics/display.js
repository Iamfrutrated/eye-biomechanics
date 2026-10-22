import { indirectSlope } from "./calculations.js";

export const RAY_PLOT = Object.freeze({
  sourceX: 72,
  lensX: 154,
  axisY: 188,
  scaleX: 82,
  scaleY: 400,
  bounds: Object.freeze({ xMin: 16, yMin: 24, xMax: 584, yMax: 400 }),
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
  const height = 0.36 * RAY_PLOT.scaleY;
  const thin = Math.max(8, height * 0.1);
  const top = cy - height;
  const bottom = cy + height;

  if (Math.abs(focalLengthM) < 1e-9) {
    return {
      shape: "none",
      d: `M${cx - 4} ${top}H${cx + 4}V${bottom}H${cx - 4}Z`,
    };
  }

  if (focalLengthM > 0) {
    return {
      shape: "convex",
      d: `M${cx} ${top} C${cx - thin} ${cy - height * 0.55}, ${cx - thin} ${cy + height * 0.55}, ${cx} ${bottom} C${cx + thin} ${cy + height * 0.55}, ${cx + thin} ${cy - height * 0.55}, ${cx} ${top}Z`,
    };
  }

  const rim = thin * 0.95;
  const waist = thin * 0.42;

  return {
    shape: "concave",
    d: `M${cx - rim} ${top} C${cx - waist} ${top + height * 0.28}, ${cx - waist} ${cy - height * 0.18}, ${cx - waist} ${cy} C${cx - waist} ${cy + height * 0.18}, ${cx - waist} ${bottom - height * 0.28}, ${cx - rim} ${bottom} L${cx + rim} ${bottom} C${cx + waist} ${bottom - height * 0.28}, ${cx + waist} ${cy + height * 0.18}, ${cx + waist} ${cy} C${cx + waist} ${cy - height * 0.18}, ${cx + waist} ${top + height * 0.28}, ${cx + rim} ${top}Z`,
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

function imageArrow(model) {
  if (model.constructionXM === null || model.constructionYM === null) {
    return { arrow: "", labelX: null, mark: null };
  }

  const [planeX, planeY] = worldToScreen(model.constructionXM, 0);
  const [tipX, tipY] = worldToScreen(model.constructionXM, model.constructionYM);
  const visible =
    planeX > RAY_PLOT.bounds.xMin &&
    planeX < RAY_PLOT.bounds.xMax &&
    tipY > RAY_PLOT.bounds.yMin - 40 &&
    tipY < RAY_PLOT.bounds.yMax + 40;

  if (!visible || Math.abs(model.constructionYM) < 0.004) {
    return { arrow: "", labelX: visible ? planeX : null, mark: visible ? { cx: tipX, cy: tipY } : null };
  }

  return {
    arrow: `M${planeX.toFixed(2)} ${planeY.toFixed(2)}L${tipX.toFixed(2)} ${tipY.toFixed(2)}`,
    labelX: planeX,
    mark: { cx: tipX, cy: tipY },
  };
}

export function buildRayGraphics(model) {
  const objectHeight = model.sourceHeightM;
  const [sourceX, sourceY] = worldToScreen(0, objectHeight);
  const [lensX, lensY] = worldToScreen(1, model.lensHeightM);
  const [baseX, baseY] = worldToScreen(0, 0);
  const straightSlope = indirectSlope(objectHeight, model.focalLengthM);
  const indirect = screenSegment(
    -0.4,
    objectHeight + straightSlope * -0.4,
    6.4,
    objectHeight + straightSlope * 6.4,
  );
  const incident = pathFromSegment(clipSegment(sourceX, sourceY, lensX, lensY));
  let outgoing = "";
  let extension = "";

  if (model.outgoingAngleRad !== null && Math.abs(model.outgoingAngleRad) < Math.PI / 2 - 0.02) {
    const slope = Math.tan(model.outgoingAngleRad);
    const [farX, farY] = worldToScreen(6.4, model.lensHeightM + 5.4 * slope);

    outgoing = pathFromSegment(clipSegment(lensX, lensY, farX, farY));

    if (model.constructionXM !== null && model.constructionXM < 1) {
      const [backX, backY] = worldToScreen(model.constructionXM, model.constructionYM);

      extension = pathFromSegment(clipSegment(lensX, lensY, backX, backY));
    }
  }

  const formedImage = imageArrow(model);

  return {
    incident,
    outgoing,
    extension,
    indirect,
    intersection: formedImage.mark,
    source: { cx: sourceX, cy: sourceY },
    objectArrow:
      Math.abs(objectHeight) < 0.004
        ? ""
        : `M${baseX.toFixed(2)} ${baseY.toFixed(2)}L${sourceX.toFixed(2)} ${sourceY.toFixed(2)}`,
    objectLabel: { x: baseX, y: Math.min(sourceY, baseY) - 12 },
    lens: lensOutline(model.focalLengthM),
    ticks: focalTicks(model.focalLengthM),
    imageArrow: formedImage.arrow,
    imageLabelX: formedImage.labelX,
    beyondCanvas: model.constructionXM !== null && formedImage.labelX === null,
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

  setPath('[data-ray-segment="indirect"]', graphics.indirect);
  setPath('[data-ray-segment="incident"]', graphics.incident);
  setPath('[data-ray-segment="outgoing"]', graphics.outgoing);
  setPath('[data-ray-segment="extension"]', graphics.extension);
  setPath("[data-ray-lens]", graphics.lens.d);
  setPath("[data-ray-ticks]", graphics.ticks.map((tick) => tick.d).join(""));
  setPath("[data-ray-object]", graphics.objectArrow);
  setPath("[data-ray-image]", graphics.imageArrow);

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
