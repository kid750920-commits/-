-- Applied on 2026-06-25 to Supabase project agowadunriupsakziwmr.
-- Purpose: Configure one primary internal owner for each major case module.
-- Run in: Supabase Dashboard > SQL Editor

alter table public.profiles
  add column if not exists is_sf_owner boolean default false,
  add column if not exists is_container_owner boolean default false,
  add column if not exists is_part_owner boolean default false,
  add column if not exists is_lcd_owner boolean default false,
  add column if not exists is_bug_owner boolean default false;

update public.profiles
set
  is_sf_owner = coalesce(is_sf_owner, false),
  is_container_owner = coalesce(is_container_owner, false),
  is_lcd_owner = coalesce(is_lcd_owner, false),
  is_bug_owner = coalesce(is_bug_owner, false),
  is_part_owner = coalesce(is_part_owner, false);

create index if not exists idx_profiles_is_sf_owner
  on public.profiles(is_sf_owner);

create index if not exists idx_profiles_is_container_owner
  on public.profiles(is_container_owner);

create index if not exists idx_profiles_is_lcd_owner
  on public.profiles(is_lcd_owner);

create index if not exists idx_profiles_is_bug_owner
  on public.profiles(is_bug_owner);

drop policy if exists "profiles read own or admin" on public.profiles;
drop policy if exists "profiles read own admin or part owner" on public.profiles;
drop policy if exists "profiles read own admin or module owners" on public.profiles;

create policy "profiles read own admin or module owners" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.current_app_role() = 'admin'
    or (
      is_active = true
      and role in ('admin', 'operator')
      and (
        coalesce(is_sf_owner, false) = true
        or coalesce(is_container_owner, false) = true
        or coalesce(is_part_owner, false) = true
        or coalesce(is_lcd_owner, false) = true
        or coalesce(is_bug_owner, false) = true
      )
    )
  );
