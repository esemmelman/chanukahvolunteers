# Chanukah Carnival - November 8th

Volunteer signup form patterned after the Mealtrain app. Name, Email, and Cell appear above 43 numbered slots across Set Up Game Booths (5), Food Prep (5), Food Service 11:00 AM (5), Food Service 12:15 PM (3), Food Clean Up (3), Game Booths 11:00 AM (8), Game Booths 12:15 PM (8), Prizes Table (1), Tickets Table (1), and Break Down Booths (4). Selecting a checkbox previews your name on its underline. Submit saves the selected slots; Cancel clears unsaved entries. Filled slots show saved names and cannot be selected. Names refresh every 15 seconds.

Serve this directory with any static web server or GitHub Pages; no build or dependencies are required.

## Backend

Uses the existing Supabase bnaimitzvah project with a dedicated `public.chanukah_carnival_signups` table. `schema.sql` records the deployed schema; do not rerun against the same database. Browser roles can insert signups and read only slot numbers and names. Email and cell numbers are private. No public update or delete access is granted. The primary key prevents two people from claiming the same slot, and a multi-slot submission saves atomically.

The browser key in app.js is intentionally publishable. Never add service-role keys or credentials to the frontend.

Submit saves the signup first, then sends one notification to esemmoc@gmail.com through dedicated Supabase Edge Functions. No participant or coordinator email is sent. The notification includes name, email, cell, and selected sections and their numbered slots. The DayFlow email relay uses its existing Resend credentials, a fixed recipient, and a submission-specific idempotency key. Email acceptance is recorded in email_notified_at. An email failure preserves the signup and displays a separate warning.
