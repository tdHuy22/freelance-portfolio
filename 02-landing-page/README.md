# Landing Page: Mực (demo SaaS)

**Live demo:** https://tdhuy22.github.io/freelance-portfolio/

A bilingual (English / Vietnamese) landing page for **Mực**, a fictional AI product that turns Vietnamese invoices, receipts and handwritten sales books into clean spreadsheets. The product, prices and figures are made up; the page is a template for real startups and small software products.

**Design**

- Editorial look: large Fraunces serif headlines, Be Vietnam Pro body text, JetBrains Mono for data. All three fonts include the Vietnamese subset, so diacritics render correctly.
- Vietnamese identity without clichés: rice-paper and ink palette, lacquer red (*sơn son*) accent, a red seal (*con dấu*) stamped on the demo invoice, document names in Vietnamese.
- Motion with a purpose:
  - the hero demo scans a handwritten bill, fills a table row by row, then stamps it;
  - headlines rise word by word;
  - scroll-revealed sections, count-up numbers and a scrolling marquee of document types (with a pause button);
  - steps that light up as you scroll, a draggable before/after comparison, and a reading-progress bar (CSS scroll-driven animation where supported).

**Engineering**

- Plain HTML, CSS and JavaScript (about 10 KB of JS, no framework or animation library).
- Language switch (EN/VI) remembers the visitor's choice and defaults to the browser language. English stays in the HTML, so the page still reads fully without JavaScript; if the script fails to load, hidden-until-animated content is shown after 3 seconds.
- Accessibility:
  - honours `prefers-reduced-motion` (everything visible, nothing moves);
  - keyboard-operable before/after slider with a text description for screen readers, skip link, visible focus;
  - text colours checked against WCAG AA in light and dark mode;
  - labelled form, semantic table roles in the demo.
- Responsive from 320px phones to wide screens; automatic dark mode.
- Motion uses `transform` and `opacity` for anything that moves, so the layout does not shift while animating.

## Run locally

```bash
python3 -m http.server 8765 --directory 02-landing-page
```

Then open http://127.0.0.1:8765.

## Typical customisations

Brand colours (variables at the top of `styles.css`), real product screenshots, a working signup form (Formspree, Mailchimp, or a Google Apps Script web app), more languages (add a block to `i18n.js`), analytics.
