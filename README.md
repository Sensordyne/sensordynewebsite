# SensorDyme — Marketing Site

A static marketing site for SensorDyme, a modular edge computer-vision platform. Dark, technical theme with a scroll-driven 3D device scene in the hero. Plain HTML, CSS, and vanilla JS — no framework, no build step, no npm install.

## Structure

```
index.html          Home page (hero, 3D device scene, use cases, comparison, technology, how it works, privacy, research, pilot CTA)
technology.html      Technical deep dive (architecture, 6-module table, privacy data flow, 7-question FAQ)
css/style.css        Design tokens + all styles for both pages (dark theme)
js/main.js           Sticky nav, mobile menu, staggered scroll-reveal, count-up stats
js/scene.js          3D device scene (Three.js via CDN ES module) — see "3D device scene" below
assets/logo.svg       Horizontal lockup (icon + wordmark) for nav/footer
assets/logo-mark.svg  Icon-only mark, used for favicon and the pilot-section watermark
```

## 3D device scene

The hero includes a procedural wireframe visualization of the SensorDyme device (body, camera lens, field-of-view rays) built from Three.js primitives — not a traced or purchased 3D model. On desktop with no reduced-motion preference, the scene pins in place while the camera dollies in as you scroll. On mobile, or with reduced motion, it simplifies to a static or gently auto-rotating view.

Three.js loads as an ES module straight from a CDN (`js/scene.js` has an `import` from `cdn.jsdelivr.net`) — there is no `npm install` and no bundler involved, so the deploy story stays exactly the same as the rest of the site.

**Fallback behavior**: `#sceneFallback` (a flat SVG of the device) is visible by default in the HTML. `js/scene.js` only hides it after WebGL support is confirmed and the 3D scene has successfully initialized. If JavaScript is disabled, the CDN is unreachable, WebGL is unsupported, or anything else goes wrong, the page simply keeps showing the static SVG — there's no broken or blank state.

## Local preview

No build tools are required. From the project root, run a local server and open it in a browser:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

(Opening `index.html` directly via `file://` also mostly works, but some browsers restrict features under `file://`, so the local server is recommended.)

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
4. Choose the branch (e.g. `main`) and the `/ (root)` folder, then save.
5. GitHub Pages will publish the site at `https://<username>.github.io/<repo-name>/` within a few minutes.

No further configuration is needed — the site has no build step and all asset paths are relative.

## Custom domain (sensordyme.com)

This repo includes a `CNAME` file pointing at `sensordyme.com`, so GitHub Pages will serve the site there instead of the default `github.io` URL once DNS is configured.

1. At your domain registrar, add these DNS records:
   - **A** records for the apex (`sensordyme.com`) → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - **CNAME** record for `www.sensordyme.com` → `sensordyne.github.io`
2. In the repo's **Settings → Pages**, set **Custom domain** to `sensordyme.com` and save (GitHub verifies it against the DNS records above).
3. DNS propagation is usually minutes, sometimes a couple of hours.
4. Once GitHub shows the domain as verified and a certificate has been issued, check **Enforce HTTPS** in the same settings page.

`www.sensordyme.com` will redirect to the apex domain automatically once both are configured.

## Notes on the logo

`assets/logo-mark.svg` (the hexagonal "S" icon) and `assets/logo.svg` (icon + "SENSORDYME" wordmark) are a hand-drawn vector recreation of the supplied logo image — built as SVG paths, not traced from the source file, so it's a close but not pixel-perfect match. If you have the original vector (AI/EPS/SVG) file, swap it in for exact fidelity:

1. Replace `assets/logo.svg` (horizontal lockup) and `assets/logo-mark.svg` (icon only, used for the favicon and the watermark in the pilot section) with the real files, keeping the same filenames so no HTML changes are needed.
2. The dark sections apply `filter: invert(1)` to render the mark in white — this works with any black-on-transparent SVG or PNG, so no extra dark-mode asset is required.
3. Update the `og:image` meta tag in both HTML files if you want the real logo in social link previews (a raster PNG/JPG is recommended there, since not all platforms render SVG previews).

## Content placeholders to review before launch

- Contact email: `hello@sensordyme.com` (used in all "Request a Pilot" CTAs).
- Canonical URL in `og:url` meta tags: `https://sensordyme.com/`.
- Copyright year and city in the footer.
