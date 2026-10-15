How the Folders Interact (The Intersection)

This is how the two folders meet

    User Input (optics/controls): The user moves a slider to change the object's distance or manually tweaks the lens shape.

    Physics Calculation (optics/calculations): ray-tracing.js recalculates where the light rays converge based on the new distance and lens geometry.

    Biological Response (anatomy/...): The physics output is fed into anatomy/... for checks related to if the lens can be stretched to a certain length.

    Visual Rendering (optics/display + anatomy/display):

        The eye cross-section updates its shape (anatomy/...).

        The light rays bend through the lens (ray-renderer.js).

        If the focus is off, a blurred image hits the retina; if it's correct, a sharp image is projected onto the brain-view.js canvas to show what the user "sees."
