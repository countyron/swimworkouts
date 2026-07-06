# Full v5.0 upload package

Upload these three files to the root of the countyron/swimworkouts GitHub repository:

- index.html
- swim-app-v50-combined.css
- swim-app-v50-combined.js

This package assumes these existing files are already in the repository root:

- app.js
- style.css
- sample-data.js
- manifest.webmanifest
- sw.js
- icon.svg

After upload, open:

https://countyron.github.io/swimworkouts/index.html?v=5.0

Updates included:

- Separate tabs: Workout, Library, Profile / Settings.
- Workout tab includes search criteria, random matching workout selection, and selected session.
- Library tab contains the full library.
- Profile tab contains swimmer profile, cloud sync, and hidden import tools.
- Choice sets use the slower of backstroke/breaststroke 100m profile for conservative pacing.
- Selected workout has an intensity map similar to the uploaded concept.
- Each workout step is clickable and shows pace/send-off/rest detail.
- Generic coach guidance and coach notes are collapsed.
- Supabase URL/key are hard-coded in index.html.
