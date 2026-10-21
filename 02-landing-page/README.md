# Landing Page: Lantern Lane Coffee (demo)

**Live demo:** https://tdhuy22.github.io/freelance-portfolio/

A one-page website for a small café. The business is fictional; the page is a template for real shops, studios and local services.

**Features**

- Plain HTML, CSS and a little JavaScript: no build step, loads fast, cheap to host (GitHub Pages, Netlify, any shared hosting).
- Responsive from 320px phones to desktop, with a collapsible mobile menu.
- Automatic dark mode.
- Accessible: skip link, keyboard-navigable menu tabs (arrow keys), visible focus, labelled form fields, live status messages.
- Order-ahead form with client-side validation. It is ready to connect to Formspree, a Google Apps Script web app (writes to a Google Sheet), or a custom backend.
- SEO basics: title, meta description, semantic headings.

## Run locally

```bash
python3 -m http.server 8765 --directory 02-landing-page
```

Then open http://127.0.0.1:8765.

## Typical customisations

Brand colours (the variables at the top of `styles.css`), real photos, Google Maps embed, Zalo or Messenger chat button, booking form connected to Google Sheets, Vietnamese/English language switch.
