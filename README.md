# Background Studio

A zero-backend visual background generator for designers and iOS/web developers.

## Features

- Linear, radial and conic gradients
- Exact elliptical radial size X/Y with centers outside bounds (e.g. `33.82% 122.46%`)
- Paste CSS / Figma style blocks to auto-fill gradient, shadow, border and radius controls
- Up to 8 color stops with HEX, opacity and position
- Shadow controls: X, Y, blur, spread, color and opacity
- Independent top-left / top-right / bottom-left / bottom-right corner radius
- Dynamic Tag / Badge mode with text-driven width, pointed tip, live preview and Auto Layout-friendly UIKit export
- Border width, color and opacity
- Custom canvas width and height
- Realtime checker/light/dark preview
- Built-in presets + custom presets stored in `localStorage`
- Import/export preset JSON
- Code output:
  - CSS
  - UIKit / Swift (`CAGradientLayer`, `CAShapeLayer`, custom elliptical radial renderer, intrinsic-content-size tag view)
  - SwiftUI
- Image output:
  - PNG
  - WebP
  - JPEG
  - SVG (linear/radial gradients)
  - PDF
- 1× / 2× / 3× / 4× raster export
- Runs entirely in the browser; no backend, no data upload


## Figma/CSS style & layout import

The editor now has two paste boxes:

- **Paste CSS / Figma style** parses gradient, shadow, border and per-corner radius values.
- **Layout / Auto Layout** parses `display`, fixed `width`/`height`, `flex-direction`, `justify-content`, `align-items`, and `gap` (including Figma variable fallbacks such as `var(--spacing-8x, 8px)`).

Layout values are included in CSS output and mapped to UIKit `UIStackView` / Auto Layout and SwiftUI stack code.

Radial gradients support explicit ellipse X/Y radii and centers outside the view bounds, e.g. `radial-gradient(147.02% 142.82% at 33.82% 122.46%, ...)`.

The Dynamic Tag / Badge mode uses intrinsic content size in UIKit and deliberately emits no fixed width constraint, so its background shape expands with the text.

## Run locally

No build step is required.

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

You can also open `index.html` directly, but running a local HTTP server gives clipboard/CDN features the most predictable behavior.


## One-click publish on macOS

The repo includes `publish.command`. It creates/pushes `background-generator` using GitHub CLI.

```bash
chmod +x publish.command
./publish.command
```

On first use, if `gh` is not authenticated, the script starts `gh auth login`. After publishing, enable **Settings → Pages → Source → GitHub Actions** once.

## Publish with GitHub Pages

### Option A — GitHub Actions (recommended)

This repository includes `.github/workflows/pages.yml`.

1. Push the repo to GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. Push to `main` if the workflow has not run yet.

Your site will be available at:

```text
https://<username>.github.io/background-generator/
```

### Option B — Deploy from branch

Because this project is static, you may also select **Deploy from a branch → main → /(root)** in GitHub Pages settings.

## Create the GitHub repo from Terminal

If GitHub CLI is installed and authenticated:

```bash
gh repo create background-generator --public --source=. --remote=origin --push
```

Or create an empty `background-generator` repository on GitHub, then:

```bash
git init
git add .
git commit -m "Initial Background Studio"
git branch -M main
git remote add origin https://github.com/<username>/background-generator.git
git push -u origin main
```

## Export notes

- PDF export uses jsPDF from jsDelivr.
- PNG/JPEG/WebP use the browser Canvas API.
- SVG supports linear and radial gradients. Conic gradients should be exported as PNG/WebP/PDF because SVG has no broadly interoperable native conic-gradient primitive.
- JPEG and PDF exports use an opaque white background because those formats do not preserve transparency in the same way PNG/WebP can.
- Shadow spread in raster export is approximated by expanding the shadow shape before applying Canvas shadow blur.

## Browser support

Designed for recent versions of Chrome, Edge, Safari and Firefox. Conic image export requires Canvas `createConicGradient`; recent browsers support it. If unavailable, the editor still works and falls back during rasterization.

## License

MIT
