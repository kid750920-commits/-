-- Pending Supabase apply.
-- Purpose: Enable RLS and create role-based policies for the shared management system.
-- Run in: Supabase Dashboard > SQL Editor, after reviewing the access model.

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role::text from public.profiles where id = auth.uid()),
    'viewer'
  )
$$;

create or replace function public.current_vendor_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select vendor_id::text from public.profiles where id = auth.uid()
$$;

create or replace function public.can_access_case(p_case_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cases c
    where c.id::text = p_case_id
      and (
        public.current_app_role() in ('admin','operator','viewer')
        or (
          public.current_app_role() = 'vendor'
          and c.vendor_id::text = public.current_vendor_id()
        )
      )
  )
$$;

alter table public.vendors enable row level security;
alter table public.locations enable row level security;
alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.case_items enable row level security;
alter table public.case_replies enable row level security;
alter table public.case_attachments enable row level security;
alter table public.case_logs enable row level security;

drop policy if exists "profiles read own or admin" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update admin only" on public.profiles;
drop policy if exists "vendors read authenticated" on public.vendors;
drop policy if exists "vendors write admin operator" on public.vendors;
drop policy if exists "locations read authenticated" on public.locations;
drop policy if exists "locations write admin operator" on public.locations;
drop policy if exists "cases select by role" on public.cases;
drop policy if exists "cases insert admin operator" on public.cases;
drop policy if exists "cases update by role" on public.cases;
drop policy if exists "cases delete owner admin" on public.cases;
drop policy if exists "items select case access" on public.case_items;
drop policy if exists "items insert admin operator" on public.case_items;
drop policy if exists "items update admin operator" on public.case_items;
drop policy if exists "items delete admin" on public.case_items;
drop policy if exists "replies select case access" on public.case_replies;
drop policy if exists "replies insert case access" on public.case_replies;
drop policy if exists "attachments select case access" on public.case_attachments;
drop policy if exists "attachments insert case access" on public.case_attachments;
drop policy if exists "attachments delete owner admin" on public.case_attachments;
drop policy if exists "logs select case access" on public.case_logs;
drop policy if exists "logs insert authenticated" on public.case_logs;

create policy "profiles read own or admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.current_app_role() = 'admin');

create policy "profiles insert own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and role = 'operator' and vendor_id is null and is_active = true);

create policy "profiles update admin only" on public.profiles
  for update to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy "vendors read authenticated" on public.vendors
  for select to authenticated
  using (true);

create policy "vendors write admin operator" on public.vendors
  for all to authenticated
  using (public.current_app_role() in ('admin','operator'))
  with check (public.current_app_role() in ('admin','operator'));

create policy "locations read authenticated" on public.locations
  for select to authenticated
  using (true);

create policy "locations write admin operator" on public.locations
  for all to authenticated
  using (public.current_app_role() in ('admin','operator'))
  with check (public.current_app_role() in ('admin','operator'));

create policy "cases select by role" on public.cases
  for select to authenticated
  using (
    public.current_app_role() in ('admin','operator','viewer')
    or (
      public.current_app_role() = 'vendor'
      and vendor_id::text = public.current_vendor_id()
    )
  );

create policy "cases insert admin operator" on public.cases
  for insert to authenticated
  with check (public.current_app_role() in ('admin','operator'));

create policy "cases update by role" on public.cases
  for update to authenticated
  using (
    public.current_app_role() in ('admin','operator')
    or (
      public.current_app_role() = 'vendor'
      and vendor_id::text = public.current_vendor_id()
    )
  )
  with check (
    public.current_app_role() in ('admin','operator')
    or (
      public.current_app_role() = 'vendor'
      and vendor_id::text = public.current_vendor_id()
    )
  );

create policy "cases delete owner admin" on public.cases
  for delete to authenticated
  using (public.current_app_role() = 'admin' or created_by::text = auth.uid()::text);

create policy "items select case access" on public.case_items
  for select to authenticated
  using (public.can_access_case(case_id::text));

create policy "items insert admin operator" on public.case_items
  for insert to authenticated
  with check (public.current_app_role() in ('admin','operator') and public.can_access_case(case_id::text));

create policy "items update admin operator" on public.case_items
  for update to authenticated
  using (public.current_app_role() in ('admin','operator') and public.can_access_case(case_id::text))
  with check (public.current_app_role() in ('admin','operator') and public.can_access_case(case_id::text));

create policy "items delete admin" on public.case_items
  for delete to authenticated
  using (public.current_app_role() = 'admin');

create policy "replies select case access" on public.case_replies
  for select to authenticated
  using (public.can_access_case(case_id::text));

create policy "replies insert case access" on public.case_replies
  for insert to authenticated
  with check (public.can_access_case(case_id::text));

create policy "attachments select case access" on public.case_attachments
  for select to authenticated
  using (public.can_access_case(case_id::text));

create policy "attachments insert case access" on public.case_attachments
  for insert to authenticated
  with check (public.can_access_case(case_id::text));

create policy "attachments delete owner admin" on public.case_attachments
  for delete to authenticated
  using (
    public.current_app_role() = 'admin'
    or exists (
      select 1 from public.cases c
      where c.id::text = case_id::text
        and c.created_by::text = auth.uid()::text
    )
  );

create policy "logs select case access" on public.case_logs
  for select to authenticated
  using (case_id is null or public.can_access_case(case_id::text));

create policy "logs insert authenticated" on public.case_logs
  for insert to authenticated
  with check (true);
