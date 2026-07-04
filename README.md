# Metric Swim Workout Library v4

V4 fixes the localStorage quota issue for large libraries such as 1,500 workouts.

## Required Supabase step
Run `supabase_schema_v4.sql` in Supabase SQL Editor.

## Upgrade from v3
1. Upload all v4 files to GitHub Pages.
2. Open the app and sign in.
3. Click `Load from cloud`.
4. If only v3 data exists, the app loads the legacy `user_workout_libraries` record without saving it to localStorage.
5. Click `Sync to cloud` to convert to the new `workouts_v4` row-per-workout structure.

## What changed
- IndexedDB local cache.
- Row-per-workout Supabase table.
- Profile stored separately.
- Keeps metric-only 25m/50m, pace per 100m, effort zones and send-offs.
