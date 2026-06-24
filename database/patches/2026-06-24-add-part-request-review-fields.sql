-- Applied to Supabase project agowadunriupsakziwmr on 2026-06-24.
-- Purpose: require approval before maintenance part requests enter the main case table.

alter table public.cases
  add column if not exists review_status text,
  add column if not exists review_note text,
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz;

update public.cases
set review_status = 'approved'
where review_status is null;

create index if not exists idx_cases_review_status
  on public.cases(review_status);
