# Chanukah Carnival - November 8

Volunteer signup form patterned after the Mealtrain app. Name, Email, and Cell appear above five numbered setup slots for 8:00–10:00 AM. Selecting a checkbox previews your name on its underline. Submit saves the selected slots; Cancel clears unsaved entries. Filled slots show saved names and cannot be selected. Names refresh every 15 seconds.

Serve this directory with any static web server or GitHub Pages; no build or dependencies are required.

## Backend

Uses the existing Supabase bnaimitzvah project with a dedicated `public.chanukah_carnival_signups` table. `schema.sql` records the deployed schema; do not rerun against the same database. Browser roles can insert signups and read only slot numbers and names. Email and cell numbers are private. No public update or delete access is granted. The primary key prevents two people from claiming the same slot, and a multi-slot submission saves atomically.

The browser key in app.js is intentionally publishable. Never add service-role keys or credentials to the frontend.

This first version includes only the requested setup section. No email notifications are configured.
