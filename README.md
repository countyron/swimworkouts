# Metric Swim Workout Library v4.2

V4.2 fixes the V4 startup crash caused by missing DOM elements and adds more defensive event binding.

## Required Supabase step
Run `supabase_schema_v4.sql` in Supabase SQL Editor before using `Sync to cloud` for the v4 database.

## Upgrade path
1. Upload all v4.2 files to the GitHub repository root.
2. Open `https://countryron.github.io/swimworkouts/index.html?v=4.1`.
3. Sign in with Supabase.
4. Click `Load from cloud`. It will load your existing V3 legacy library from `user_workout_libraries` if v4 rows are not present.
5. Click `Sync to cloud` to convert the 2,040 workouts into row-per-workout `workouts_v4` storage.

## Main changes
- IndexedDB local cache, not localStorage.
- Row-per-workout Supabase storage.
- Defensive startup code to avoid null onclick/classList errors.
- Cache-busted script references and service-worker cache name.


## v4.2 fix

- Sanitises invalid workout dates before syncing to Supabase.
- Invalid parsed dates such as `2025-30-25` are stored as `null` instead of causing the sync to fail.
- Uses cache-busted `app.js?v=4.2`.
