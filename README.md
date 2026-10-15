# OptiAnatomy: Interactive Human Eye & Optics Simulation

<!--
Badge placeholders: replace these with repository-specific workflow, release,
coverage, and license badges when those facilities exist.
-->

[![Project status: planning](https://img.shields.io/badge/status-planning-2563eb)](#project-status)
[![Build: not configured](https://img.shields.io/badge/build-not_configured-lightgrey)](#project-status)
[![License: not specified](https://img.shields.io/badge/license-not_specified-lightgrey)](#license)

OptiAnatomy is a planned interactive browser simulation that bridges optical
physics and biological anatomy. Its goal is to help learners explore how lens
accommodation changes across object distances, how variable—including
deliberately unusual—lens curvatures alter a simplified optical model, and how
the resulting focus could be represented in a simulated brain-view panel.

The repository is currently an early static-web scaffold. It does **not** yet
contain a working simulation, interactive controls, numerical eye model, or
validated scientific dataset. The sections below describe the product
direction and a proposed architecture while clearly separating those plans
from the implementation that exists today.

## Table of contents

- [Project status](#project-status)
- [Goals and scope](#goals-and-scope)
- [Planned features](#planned-features)
- [Scientific scope](#scientific-scope)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
- [Usage](#usage)
- [Development guidance](#development-guidance)
- [Scientific validation](#scientific-validation)
- [Contributing](#contributing)
- [License](#license)

## Project status

OptiAnatomy is in the **planning/scaffolding** stage.

| Area | Current state |
| --- | --- |
| Page structure | `index.html` exists but is empty |
| Styling | `style.css` exists but is empty |
| Simulation engine | Not implemented |
| Interactive controls | Not implemented |
| Anatomical model or assets | Not present |
| Automated tests | Not configured |
| Build tooling | Not configured |
| Package dependencies | None declared |

This status is intentionally explicit so that the intended feature set is not
mistaken for an available or scientifically validated application.

## Goals and scope

The project is intended to:

1. Present important ocular structures in a clear, approachable visual model.
2. Relate ciliary action and lens accommodation to a simplified optical model.
3. Illustrate ray propagation, refraction, and retinal focus using declared
   assumptions.
4. Allow learners to vary object distance and lens shape, including
   non-physiological shapes used for controlled exploration.
5. Relate retinal focus to a clearly labeled, simulated sharp-or-blurred
   projection rather than claiming to reproduce human perception.
6. Keep educational explanations, units, conventions, and limitations close
   to the visualization.

OptiAnatomy is an educational visualization, not a diagnostic device, clinical
calculator, treatment-planning system, or substitute for professional medical
advice.

## Planned features

The following capabilities are **planned**; none is implemented in the current
repository:

- **Optics engine** — perform real-time geometrical ray tracing, apply Snell's
  law at modeled refracting surfaces, and support custom lens geometry.
- **Anatomy and accommodation model** — connect modeled ciliary tension to lens
  shape while enforcing declared deformation limits.
- **Retinal mapping** — map traced rays to a simplified retinal image plane
  using documented coordinates and assumptions.
- **Object-distance control** — change modeled object distance and observe the
  corresponding accommodation and focus behavior.
- **Manual lens-shape control** — explore normal and unusual curvatures,
  including values outside physiological examples when clearly labeled.
- **Brain projection** — display a simulated sharp or blurred view derived from
  model defocus. This will be an educational rendering, not a reconstruction
  of neural processing or subjective vision.
- **Layered explanations** — pair visual changes with anatomical and optical
  context, symbols, units, and model limitations.
- **Responsive, accessible interface** — support keyboard operation, readable
  contrast, clear labels, and alternatives to color-only encoding.

Feature definitions should become testable specifications before
implementation. Any numerical feature should also identify its source model,
parameter ranges, units, and expected uncertainty.

## Scientific scope

The human eye is a complex, dynamic biological optical system. A browser
simulation necessarily simplifies its geometry and material properties.
Depending on the model eventually selected, relevant factors may include:

- refractive indices and curvature of optical surfaces;
- anterior-chamber depth, lens thickness, and axial length;
- wavelength dependence and chromatic effects;
- pupil size and off-axis behavior;
- accommodation and age-dependent changes;
- higher-order aberrations and individual anatomical variation.

A thin-lens diagram, paraxial ray trace, schematic eye, and anatomically
detailed optical model are not interchangeable. The implementation should name
the model it uses and avoid presenting approximate diagrams as patient-specific
predictions. Values shown in the interface should include units and references,
and rounded display values should not imply greater precision than the source
data supports.

## Architecture

### Current repository

```text
.
├── index.html   # Reserved for document structure and accessible page content
└── style.css    # Reserved for visual presentation and responsive layout
```

Both tracked files are currently empty. There is no JavaScript entry point,
server, API, database, package manifest, bundler, or test runner.

### Intended project structure

The supplied design calls for the following client-side module layout. These
files and directories are **planned and do not yet exist**, except for the two
empty root files marked below:

```text
.
├── index.html                  # Present, empty: semantic application shell
├── style.css                   # Present, empty: layout and visual styling
├── main.js                     # Planned: initialize and coordinate the app
├── optics/
│   ├── calculations.js         # Planned: ray tracing and refraction math
│   ├── display.js              # Planned: optical-path canvas rendering
│   └── controls.js             # Planned: optics input bindings/validation
└── anatomy/
    ├── calculations.js         # Planned: accommodation and retinal mapping
    ├── display.js              # Planned: anatomy and brain-view rendering
    └── controls.js             # Planned: anatomy input bindings/validation
```

Exact module interfaces should be documented when they are implemented; the
tree above defines responsibilities, not working imports.

### Responsibility boundaries

As functionality is added, responsibilities should remain separated so that
scientific calculations can be reviewed independently from rendering and user
interface code:

```text
User input
    │
    ▼
Input validation ──► Model parameters
                         │
                         ▼
                  Optics computation
                         │
                         ▼
                  Simulation state
                    ┌────┴────┐
                    ▼         ▼
              Visualization  Explanations
```

| Responsibility | Purpose |
| --- | --- |
| `index.html` | Provide the semantic application shell, controls, labels, help text, and accessible output regions |
| `style.css` | Define layout, responsive presentation, focus states, and non-color-only visual cues |
| `main.js` | Initialize modules, coordinate shared state, and schedule updates without embedding scientific equations |
| `optics/calculations.js` | Own deterministic ray/surface intersection and Snell's-law calculations, including conventions and failure cases |
| `optics/display.js` | Render optical geometry and ray paths from calculation results |
| `optics/controls.js` | Read and validate object-distance and lens-geometry inputs |
| `anatomy/calculations.js` | Model bounded accommodation behavior and map optical output to the simplified retinal plane |
| `anatomy/display.js` | Render anatomical state, retinal mapping, and the explicitly simulated brain projection |
| `anatomy/controls.js` | Bind anatomy/accommodation controls and present range or validity feedback |
| Verification | Compare model outputs with analytical cases and documented reference values |

This is a design direction, not a description of modules already present.
Concrete directories and interfaces should be documented only when they are
introduced.

## Technology stack

### Intended stack

- **HTML5** for semantic structure and accessible controls
- **CSS3** for presentation and responsive layout
- **Vanilla JavaScript** for simulation logic, state, and interaction
- **Canvas API** for optical, anatomical, retinal, and brain-view rendering

The application is intended to run entirely in the browser without a complex
backend. In the current checkout, only empty `index.html` and `style.css` files
exist: JavaScript, Canvas rendering, calculations, and controls have not been
implemented. No framework, package manager, server, database, dependency
manifest, or build pipeline is configured.

## Getting started

### Prerequisites

For the repository in its current state, you need:

- Git, to clone the repository; and
- a modern web browser, to open static files.

There are no dependencies to install and no build step.

### Clone the repository

```bash
git clone https://github.com/Iamfrutrated/eye-biomechanics.git
cd eye-biomechanics
```

Because `index.html` is currently empty, opening it will display a blank page.
That is expected at this stage. No development-server command is provided
because the repository does not configure one.

## Usage

There is no usable simulation yet. Once an interface exists, this section
should document:

1. how to launch the application using a repository-provided command;
2. how to set object distance or choose automatic accommodation;
3. how to adjust lens shape and recognize non-physiological values;
4. how to interpret ray paths, retinal mapping, and the simulated brain view;
5. which parameters can be changed and in what units; and
6. how to reset, compare, or export a scenario, if those capabilities are
   implemented.

Usage documentation should not claim controls or outputs before they are
available in the checked-in application.

## Development guidance

Until project tooling is added, changes can be made directly to `index.html`
and `style.css`. Keep the baseline implementation usable without assuming a
particular local server or package manager.

When implementation begins:

- use semantic HTML and associated labels for every interactive control;
- keep model calculations independent from DOM and rendering code;
- define one coordinate system and document sign conventions;
- attach units to both input and output values;
- validate ranges at the input boundary;
- avoid using display rounding in subsequent calculations;
- provide textual equivalents for important visual results;
- cite sources for anatomical dimensions and optical constants; and
- add tests alongside each scientific calculation.

### Suggested review checklist

```text
[ ] The feature exists in the repository and is documented as implemented.
[ ] Input units, ranges, defaults, and validation behavior are defined.
[ ] Equations and sign conventions are documented.
[ ] Reference sources and applicable populations are identified.
[ ] Analytical or published reference cases are covered by tests.
[ ] Visual output agrees with the numerical result.
[ ] Keyboard and screen-reader behavior has been checked.
[ ] Limitations are visible to the learner.
```

## Scientific validation

Before numerical results are presented as meaningful, the project should:

1. state the optical model and all simplifying assumptions;
2. cite primary or authoritative sources for constants and anatomical ranges;
3. test dimensional consistency and coordinate/sign conventions;
4. compare calculations with solvable analytical cases;
5. compare representative outputs with published reference values;
6. document acceptable tolerances and numerical edge cases; and
7. have scientific and educational wording reviewed by a qualified subject
   matter expert.

Passing software tests alone does not establish physiological or clinical
validity.

## License

No license file is present. Unless and until a license is added, no open-source
license should be assumed. Contributors should confirm the intended licensing
terms before distributing or reusing the project.

## The Vision

This project will have two parts. One part is the POV of a person sitting in a chair from their point of view. The how far the wall is from them is one of the parameters that can be changed. A second page of the website will show the lens and the anatomy of the eye and allow the user to have certain tweaks (need to be decided what can be changed). This will show the effect of myopia.
