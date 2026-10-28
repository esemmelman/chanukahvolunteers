-- Expand slot capacity without changing any existing volunteer assignments.
begin;
alter table public.chanukah_carnival_signups
  drop constraint chanukah_carnival_signups_slot_check;
alter table public.chanukah_carnival_signups
  add constraint chanukah_carnival_signups_slot_check check (slot between 1 and 48);
commit;
