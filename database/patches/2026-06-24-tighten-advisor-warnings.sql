-- Pending Supabase apply.
-- Purpose: Reduce security advisor warnings after enabling role-based RLS.

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role::text from public.profiles where id = auth.uid() and is_active = true),
    'blocked'
  )
$$;

create or replace function public.current_vendor_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select vendor_id::text from public.profiles where id = auth.uid() and is_active = true
$$;

create or replace function public.generate_case_no(p_prefix text)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_today text := to_char(now() at time zone 'Asia/Taipei', 'YYYYMMDD');
  v_count int;
  v_no text;
  v_lock_id bigint;
begin
  v_lock_id := ('x' || md5(coalesce(p_prefix, 'CASE')))::bit(64)::bigint;
  perform pg_advisory_xact_lock(v_lock_id);

  select count(*) into v_count
  from public.cases
  where case_no like p_prefix || '-' || v_today || '-%';

  v_no := p_prefix || '-' || v_today || '-' || lpad((v_count + 1)::text, 3, '0');
  return v_no;
end;
$$;

revoke execute on function public.current_app_role() from public, anon;
revoke execute on function public.current_vendor_id() from public, anon;
revoke execute on function public.can_access_case(text) from public, anon;
revoke execute on function public.generate_case_no(text) from public, anon;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.current_vendor_id() to authenticated;
grant execute on function public.can_access_case(text) to authenticated;
grant execute on function public.generate_case_no(text) to authenticated;

drop policy if exists "logs insert authenticated" on public.case_logs;
create policy "logs insert active profile" on public.case_logs
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
    )
  );
