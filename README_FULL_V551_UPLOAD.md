## Full v5.5.1 upload package

Upload these files to the root of the countyron/swimworkouts GitHub repository:
- `index.html` - use `index-v551.html` from this package but rename it to `index.html` when uploading
- `swim-app-v551-combined.css`
- `swim-app-v551-combined.js`

Keep these existing files in the repository root:
- `app.js`
- `style.css`
- `sample-data.js`
- `manifest.webmanifest`
- `sw.js`
- `icon.svg`

Open after upload:
https://countyron.github.io/swimworkouts/index.html?v=5.5.1

Main fixes:
- Removed the runaway full-page MutationObserver loop that caused iPhone lag.
- Stopped repeatedly rebuilding the donut visual and re-attaching handlers.
- Removed the duplicate `touchend`/`click` step handler pattern that caused taps/buttons to misfire on iPhone.
- Added mobile tap CSS and smoother list scrolling.
- Kept v5.5 features: tabs, favourites, pool toggle, library filters, donut format, inline step details, and in-app email code login.
