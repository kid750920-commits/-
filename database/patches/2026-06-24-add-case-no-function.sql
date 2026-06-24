-- Pending Supabase apply.
-- Purpose: Atomic case number generation using advisory locks to avoid duplicate numbers.
-- Run in: Supabase Dashboard > SQL Editor before deploying app.js that calls generate_case_no().

create or replace function public.generate_case_no(p_prefix text)
returns text
language plpgsql
security definer
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

grant execute on function public.generate_case_no(text) to authenticated;
