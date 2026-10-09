-- Dedicated signup table; contact details cannot be read by browser roles.
create table public.chanukah_carnival_signups (
 slot smallint primary key check (slot between 1 and 46),
 submission_id uuid not null,
 full_name text not null check (length(trim(full_name)) between 1 and 120),
 email text not null check (length(email) between 3 and 254 and position('@' in email) > 1),
 phone text not null check (length(phone) <= 40 and length(regexp_replace(phone, '[^0-9]', '', 'g')) between 10 and 15),
 created_at timestamptz not null default now(),
 email_notified_at timestamptz
);
alter table public.chanukah_carnival_signups enable row level security;
revoke all on public.chanukah_carnival_signups from public, anon, authenticated;
grant select (slot, full_name) on public.chanukah_carnival_signups to anon, authenticated;
grant insert (slot, submission_id, full_name, email, phone) on public.chanukah_carnival_signups to anon, authenticated;
create policy carnival_read_names on public.chanukah_carnival_signups for select to anon, authenticated using (true);
create policy carnival_submit on public.chanukah_carnival_signups for insert to anon, authenticated with check (true);

-- Server-only Apps Script connection; populate token privately.
create table public.chanukah_carnival_email_settings (
 id integer primary key check (id = 1),
 script_url text not null default '',
 token text not null
);
alter table public.chanukah_carnival_email_settings enable row level security;
revoke all on public.chanukah_carnival_email_settings from public, anon, authenticated;
grant select on public.chanukah_carnival_email_settings to service_role;
