# Star stability diagnostic

This is a development-only, direct WebGL capture. The production `index.html`
does not import `star-stability.html`. The harness uses the production point
shaders, ACES output path, and bloom settings with ten fixed, isolated points.
It captures 33 consecutive rendered frames (16 for stationary cases), moving
the camera by 0.125 physical pixels per frame. For each source, it records a
25 x 25 output pixel region, peak luminance, integrated luminance, bright pixel
count, and projected screen position. The first, middle, and final full frames
are saved as PNGs. `summary.json` pairs baseline and corrected captures.

To repeat a series from this repository:

1. Run `npm run dev -- --host 127.0.0.1`.
2. Run `node scripts/star-stability-capture.mjs` in a second terminal.
3. Open `http://127.0.0.1:5173/star-stability.html?phase=after&layer=catalogue&axis=x&bloom=0&scale=1&w=2560&h=1440` in a WebGL browser. The page saves its capture automatically.
4. Change `layer` to `procedural` or `cloud`, `axis` to `y` or `still`, `bloom` to `1`, or `scale` to `0.5` for other cases.
5. Run `node scripts/summarize-star-stability.mjs` to rebuild the comparisons.

The `before` directory contains direct captures from the previous two-pixel
footprint. The `after` directory contains captures from the corrected shader.
The half-scale cloud bloom-off baseline was overwritten during exploration;
the intact bloom-on pair is used for that comparison. The browser did not
generate a paired baseline for any new parameters, so the summary script only
compares names with both baseline and corrected captures.

These captures isolate point rendering and the output path. They do not measure
the full voyage scene, native WebView2, star tier transitions during spatial
travel, or GPU frame time. `preserveDrawingBuffer` and `readPixels` are enabled
only in the diagnostic harness and are not used in production.
