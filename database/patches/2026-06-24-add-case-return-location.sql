-- Applied to Supabase project agowadunriupsakziwmr on 2026-06-24.
-- Purpose: allow vendor return shipments to be sent to a different office/location
-- than the original repair request location.

alter table public.cases
  add column if not exists return_location_id text references public.locations(id) on delete set null;

create index if not exists idx_cases_return_location_id
  on public.cases(return_location_id);
