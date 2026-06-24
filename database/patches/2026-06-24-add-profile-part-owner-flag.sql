-- Pending Supabase apply.
-- Purpose: choose one account as the fixed owner/reviewer for maintenance part requests.

alter table public.profiles
  add column if not exists is_part_owner boolean default false;

update public.profiles
set is_part_owner = false
where is_part_owner is null;

create index if not exists idx_profiles_is_part_owner
  on public.profiles(is_part_owner);
