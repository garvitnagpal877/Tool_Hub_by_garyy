# Tools by Vizznity — deployment notes

Static site. No build step, no server code. Upload the folder contents to any static host
(e.g. `tools.vizznity.com`) keeping the folder structure.

```
index.html                  homepage (chooser, tool cards, privacy section)
tools/                      six tool pages (each keeps its original inline script, unchanged)
docs/                       six user guides
assets/
  vz-shared.css / .js       shared accessibility, notices, library-failure handling (no tool logic)
  vz-guide.css              shared guide layout
  *.png                     logos and icons
```

## Requirements
* The pages can be opened from a web server or directly from disk (`file://`).
* Every tool page loads SheetJS 0.18.5 from `cdnjs.cloudflare.com`; the homepage and the
  purchase-rate guide load Google Fonts. An internet connection is needed when a page opens.
  If SheetJS cannot load, tools show a clear banner instead of failing silently.

## Before going live
1. Run the manual regression checklist with real files (see the review report, section E).
2. Confirm the contact details in the homepage footer (phone number shown differs from the `tel:` link).
   The business email (`info@vizznity.com`) appears in two places in `index.html` only: the "Talk to Vizznity" button and the footer
   "Contact Vizznity" column. Update both if it ever changes. The mailbox itself has not been tested from this project.
3. Update the MSME default RBI Bank Rate table if the owner approves (see report, item L-2).

## Recommended hardening (not applied — needs your approval and a test with the real library)
* Self-host SheetJS (`assets/vendor/`) or add a Subresource Integrity hash to the CDN tag, and upgrade
  from 0.18.5 after re-running the regression checklist.
* Self-host the fonts to remove the Google Fonts request.
* Optional Content-Security-Policy `<meta>` tag with `connect-src 'none'; form-action 'none'` to make
  “no network requests from the page” technically enforced. Test with real files first.

## Guides and tools stay in step
`docs/*-guide.html` were checked against the tool source on 31 October 2026. If a tool changes,
update its guide in the same commit.
