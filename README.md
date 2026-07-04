# Metric Swim Workout Library - Version 3 Supabase Sync

This version adds Supabase cloud sync so your workout library/profile can be shared between iPhone, iPad and laptop.

## 1. Create Supabase project

Create a Supabase project, then copy:

- Project URL
- Publishable key, or legacy anon public key

## 2. Create the database table

Open Supabase Dashboard > SQL Editor, paste and run:

```sql
-- use the included supabase_schema.sql file
```

The file creates `public.user_workout_libraries`, enables Row Level Security, and adds policies so each signed-in user can only read/write their own workout library.

## 3. Open the app

Open `index.html` or host this folder on GitHub Pages.

In the **Cloud Sync** panel:

1. Paste Supabase Project URL.
2. Paste Supabase publishable/anon key.
3. Enter your email.
4. Click **Save connection**.
5. Click **Send magic link**.
6. Open the email link on the same device/browser.
7. Click **Sync to cloud**.

On another device, use the same URL/key/email, sign in, then click **Load from cloud**.

## Notes

- This is still a client-side static app suitable for GitHub Pages.
- Do not use a Supabase `service_role` key in this app.
- The publishable/anon key is intended for browser use when Row Level Security policies are correctly configured.
