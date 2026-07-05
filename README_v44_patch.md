# v4.4 Patch - Cleaner Workout Step Names + Hidden Import Section

This patch does two things:

1. Hides the import section by default, because new workout imports are rare.
2. Cleans interval/send-off fragments out of workout step names.

## Files

- `v44-display-import-patch.js`
- `v44-display-import-patch.css`

## Install

Upload both files to the root of your GitHub repository, next to `index.html` and `app.js`.

Then edit `index.html`.

### Add the CSS file

In the `<head>` section, after the existing stylesheet:

```html
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="v44-display-import-patch.css?v=4.4">
```

### Add the patch JS file

Near the bottom of `index.html`, after `app.js`:

```html
<script src="app.js?v=4.3"></script>
<script src="v44-display-import-patch.js?v=4.4"></script>
```

If your app is currently using `app.js?v=4.2`, keep your current version and add the patch script after it.

## What gets fixed

Examples that currently look like this:

```text
Drill/Swim by 501:451:501:552:00
Free - Subkick 60:551:001:051:10
Kick1:001:051:101:15
Free - DPS1:301:401:502:00
```

will display more cleanly as:

```text
Drill/Swim by 50
Free - Subkick 60
Kick
Free - DPS
```

The patch cleans already-imported workout names at display time. It also improves future import parsing where the parser function is globally available.

## Import section behaviour

The import section is hidden by default. A small `Show import tools` button is added to the Cloud Sync button row so you can reveal it when needed.
