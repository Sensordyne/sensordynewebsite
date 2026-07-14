# SensorDyme — Marketing Site

A static marketing site for SensorDyme, a modular edge computer-vision platform. Plain HTML, CSS, and vanilla JS — no framework, no build step.

## Structure

```
index.html          Home page (hero, platform, technology, privacy, research, pilot CTA)
technology.html      Technical deep dive (architecture, module table, privacy data flow, FAQ)
css/style.css        Design tokens + all styles for both pages
js/main.js           Sticky nav state, mobile menu, scroll-reveal animations
assets/logo.svg       Placeholder wordmark (see note below)
```

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

The brief specifies a logo at `assets/logo.png` (a black hexagonal "S" mark + "SENSORDYME" wordmark). No such file existed in this repository, so `assets/logo.svg` was created as a code-drawn stand-in matching that description. To swap in the real asset:

1. Add the real logo file to `assets/` (SVG is preferable to PNG since it stays crisp at any size and works cleanly with the `filter: invert(1)` trick used to render it white on dark sections).
2. Update the `src` on the `<img>` tags in the `.nav__logo` and `.footer__logo` elements in `index.html` and `technology.html`.
3. Update the `og:image` meta tag in both files if you want the real logo in social link previews (a raster PNG/JPG is recommended there, since not all platforms render SVG previews).

## Content placeholders to review before launch

- Contact email: `hello@sensordyme.com` (used in all "Request a Pilot" CTAs).
- Canonical URL in `og:url` meta tags: `https://sensordyme.com/`.
- Copyright year and city in the footer.
