# SensorDyme — Official Website

The official website for SensorDyme, the AI camera that detects and protects. White, minimal, Apple-inspired design built to the SensorDyme Website Master Specification. Plain HTML, CSS, and vanilla JS — no framework, no build step, no npm install.

## Structure

```
index.html           Homepage (built to the design mockup): announcement bar, commerce nav
                     with inline search + Company dropdown, split hero with 3D camera on a
                     pedestal card, trust strip, 16 use-case tiles, product showcase with
                     thumbnail gallery, "real life" demo cards, 6-stat strip, 5-step
                     How It Works, lifestyle gallery, bento feature grid, commerce footer
solutions.html       13 use-case sections (home, baby, elderly, teen driving, pets,
                     education, business, warehouse, construction, agriculture,
                     healthcare, retail, government) with anchor nav
product.html         Product detail: 3D hero, technology hotspots, prompt-builder demo,
                     specs, what's in the box, pricing, FAQ
about.html           Mission, vision, values, contact CTA
technology.html      Redirect stub → product.html#technology (kept so old links don't 404)
css/style.css        The full design system + commerce layout components
js/main.js           Nav (hide-on-scroll), announcement bar, mobile menu, search overlay
                     (Ctrl+K / "/" / inline field), Company dropdown, language selector
                     (13 languages, persisted, synced to footer select), cart drawer
                     (localStorage), gallery thumbnails, scroll reveals, FAQ accordion,
                     prompt-builder demo
js/hero3d.js         Three.js floating/rotating camera (CDN module, SVG fallback)
js/journey.js        LEGACY — previous dark-theme 3D journey homepage (unreferenced)
js/scene.js          LEGACY — previous scroll scene (unreferenced)
assets/logo.svg       Horizontal lockup (icon + wordmark)
assets/logo-mark.svg  Icon-only mark (favicon, notification mockups)
```

## Design system (from the master spec)

- Backgrounds `#FFFFFF` / `#F7F7F7`, borders `#D9D9D9`, text `#111111` / `#555555`
- Accent: SensorDyme Blue `#2563EB` (links, primary buttons, AI highlights only)
- Success `#22C55E`, Warning `#F59E0B`, Danger `#EF4444`
- Font: Inter (Google Fonts), fallback SF Pro Display / Helvetica Neue / Arial
- Lucide-style thin rounded inline SVG icons throughout

## Behavior notes

- **3D hero** (`js/hero3d.js`) builds a stylized camera from Three.js primitives — a
  stand-in until final renders/photos of the production hardware exist. It loads Three.js
  from a pinned CDN via an import map; on any failure (no WebGL, CDN blocked) the static
  SVG fallback in the HTML simply stays visible.
- **Cart / checkout**: fully client-side (localStorage). Checkout opens a prefilled
  order-inquiry email — no payment details are collected anywhere. Swap in a real
  checkout (Stripe/Shopify) when ready.
- **Search**: client-side index over the site's pages; any product-ish keyword
  (camera, AI, security, baby, pet, warehouse…) returns the SensorDyme AI Camera.
- **Language selector**: 13 languages listed, choice persists in localStorage; content
  translation itself is marked "coming soon" (static site — wire up real translations later).
- **Honesty guardrails from the spec**: all hardware specs are labeled placeholders,
  testimonials are labeled illustrative, and no invented performance metrics,
  certifications, or customer counts appear anywhere.

## Official assets

- **Logo**: save the official transparent logo as `assets/logo-official.png` —
  the site auto-detects it and swaps every logo mark and the favicon. Until it
  exists, a vector recreation (`assets/logo-mark.svg`) is used.
- **Product photos**: the 3D hero model and all vector artwork follow the
  official hardware design (wide graphite body, pill lens recess, mic holes,
  light bar). AI scene photos describe the same device; for perfect fidelity,
  composite real product photography using the prompts in `assets/img/PROMPTS.md`.

## Languages

The globe selector translates the entire site (13 languages). Dictionaries
live in `assets/i18n/<code>.json`, keyed by the English source string; the
runtime walker in `js/main.js` translates all text, attributes, and
dynamically rendered content (cart, search), sets `lang`/`dir` (RTL for
Arabic), and persists the choice in localStorage. After copy changes,
re-extract strings and regenerate dictionaries (see PROMPTS.md notes).

## Local preview

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. **Settings → Pages** → Source: `Deploy from a branch` → `main`, `/ (root)`.
3. The included `CNAME` file points at `sensordyme.com`; configure DNS
   (A records → GitHub Pages IPs, `www` CNAME → the `github.io` host), set the custom
   domain in Pages settings, then enable **Enforce HTTPS**.

## Content placeholders to review before launch

- Hardware specifications (marked "placeholder — final spec TBD" on index + product pages).
- Testimonials (labeled illustrative; replace with named customer stories).
- Contact email `hello@sensordyme.com` used for orders, demos, sales, and newsletter.
- Legal pages (Privacy Policy, Terms, Accessibility) are unlinked placeholders in the footer.
- Sign-in (account icon) currently opens an email; replace with real auth when available.
