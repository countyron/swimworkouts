# Full v5.3 upload package

Upload these three files to the root of the countyron/swimworkouts GitHub repository:

- index.html
- swim-app-v53-combined.css
- swim-app-v53-combined.js

This package assumes these existing files are already in the repository root:

- app.js
- style.css
- sample-data.js
- manifest.webmanifest
- sw.js
- icon.svg

After upload, open:

https://countyron.github.io/swimworkouts/index.html?v=5.3

Updates included:

- Removes the horizontal intensity bar from the selected workout card.
- Makes the circular workout format cleaner and more visually focused.
- Keeps the circular ring interactive: tap a ring segment to open the matching step details.
- Fixes random workout selection so it searches all loaded library cards, not only visible cards.
- Adds a robust Library tab filter panel for title/text, distance, and focus.
- Keeps the dedicated library scroll window.
