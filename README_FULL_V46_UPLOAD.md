# Full v4.6 upload package

Upload these files to the root of the countyron/swimworkouts GitHub repository:

- index.html
- v45-cleanup-patch.css
- v45-cleanup-patch.js
- v46-ui-patch.css
- v46-ui-patch.js

This package assumes these existing files are already in the repository root:

- app.js
- style.css
- sample-data.js
- manifest.webmanifest
- sw.js
- icon.svg

After upload, open:

https://countyron.github.io/swimworkouts/index.html?v=4.6

Included updates:

- Supabase URL and publishable key are hard-coded in index.html.
- Cloud Sync is collapsible.
- Import section is hidden by default.
- Coach notes are collapsed by default.
- Profile has separate 100m inputs for freestyle, backstroke, breaststroke, and kick.
- Workout card and step names are cleaned at display time.
