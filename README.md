# Metric Swim Workout Library v4.3

V4.3 fixes the issue where only 400 workouts were loaded from `workouts_v4` even though the older `user_workout_libraries` table still contained 2,040 workouts.

## Key fix
On **Load from cloud**, the app now checks both:

- `workouts_v4`
- `user_workout_libraries`

If the legacy library has more workouts than `workouts_v4`, the app loads the full legacy library first and tells you to click **Sync to cloud** to upgrade all workouts into `workouts_v4`.

## Steps
1. Upload all v4.3 files to GitHub Pages.
2. Open `https://countryron.github.io/swimworkouts/index.html?v=4.3`.
3. Click **Load from cloud**.
4. Confirm the status says it loaded the legacy library, likely 2,040 workouts.
5. Click **Sync to cloud**.
6. Check Supabase: `select count(*) from workouts_v4;`
