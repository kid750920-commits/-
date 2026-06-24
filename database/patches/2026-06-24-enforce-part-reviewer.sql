-- Pending Supabase apply.
-- Purpose: Only admins or the configured maintenance part owner can approve/reject part requests.

create or replace function public.enforce_part_review_authorization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_is_part_owner boolean;
  v_is_review_decision boolean;
begin
  if coalesce(old.case_type, '') <> '維修料品申請' then
    return new;
  end if;

  v_is_review_decision :=
    new.review_status is distinct from old.review_status
    and new.review_status in ('approved', 'rejected');

  if not v_is_review_decision then
    return new;
  end if;

  select role, coalesce(is_part_owner, false)
  into v_role, v_is_part_owner
  from public.profiles
  where id = auth.uid()
    and is_active = true;

  if coalesce(v_role, '') = 'admin' or coalesce(v_is_part_owner, false) then
    return new;
  end if;

  raise exception 'Only admin or configured maintenance part owner can review part requests';
end;
$$;

drop trigger if exists trg_enforce_part_review_authorization on public.cases;
create trigger trg_enforce_part_review_authorization
  before update of review_status, review_note, reviewed_by, reviewed_at, status
  on public.cases
  for each row
  execute function public.enforce_part_review_authorization();

revoke execute on function public.enforce_part_review_authorization() from public, anon, authenticated;
