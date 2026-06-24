-- Pending Supabase apply.
-- Purpose: Let non-admin users read the configured maintenance part owner profile
-- so new part requests can auto-fill the fixed reviewer under RLS.

drop policy if exists "profiles read own or admin" on public.profiles;

create policy "profiles read own admin or part owner" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.current_app_role() = 'admin'
    or (
      is_active = true
      and coalesce(is_part_owner, false) = true
      and role in ('admin', 'operator')
    )
  );
