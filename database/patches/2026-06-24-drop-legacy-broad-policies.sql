-- Pending Supabase apply.
-- Purpose: Remove old broad authenticated policies so the role-based RLS policies are effective.
-- Run in: Supabase Dashboard > SQL Editor after 2026-06-24-enable-rls.sql.

drop policy if exists "authenticated read vendors" on public.vendors;
drop policy if exists "authenticated insert vendors" on public.vendors;
drop policy if exists "authenticated update vendors" on public.vendors;
drop policy if exists "authenticated delete vendors" on public.vendors;

drop policy if exists "authenticated read locations" on public.locations;
drop policy if exists "authenticated insert locations" on public.locations;
drop policy if exists "authenticated update locations" on public.locations;
drop policy if exists "authenticated delete locations" on public.locations;

drop policy if exists "authenticated read profiles" on public.profiles;
drop policy if exists "authenticated update profiles" on public.profiles;

drop policy if exists "authenticated read cases" on public.cases;
drop policy if exists "authenticated insert cases" on public.cases;
drop policy if exists "authenticated update cases" on public.cases;
drop policy if exists "owner or admin delete cases" on public.cases;

drop policy if exists "authenticated read case_items" on public.case_items;
drop policy if exists "authenticated insert case_items" on public.case_items;
drop policy if exists "authenticated update case_items" on public.case_items;
drop policy if exists "authenticated delete case_items" on public.case_items;

drop policy if exists "authenticated read case_replies" on public.case_replies;
drop policy if exists "authenticated insert case_replies" on public.case_replies;
drop policy if exists "authenticated update case_replies" on public.case_replies;
drop policy if exists "authenticated delete case_replies" on public.case_replies;

drop policy if exists "authenticated read case_attachments" on public.case_attachments;
drop policy if exists "authenticated insert case_attachments" on public.case_attachments;
drop policy if exists "authenticated update case_attachments" on public.case_attachments;
drop policy if exists "authenticated delete case_attachments" on public.case_attachments;

drop policy if exists "authenticated read case_logs" on public.case_logs;
drop policy if exists "authenticated insert case_logs" on public.case_logs;
drop policy if exists "authenticated update case_logs" on public.case_logs;
drop policy if exists "authenticated delete case_logs" on public.case_logs;

drop policy if exists "case attachments authenticated insert" on storage.objects;
drop policy if exists "case attachments authenticated update" on storage.objects;
drop policy if exists "case attachments authenticated delete" on storage.objects;

create policy "case attachments insert case access" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'case-attachments'
    and public.can_access_case((storage.foldername(name))[1])
  );

create policy "case attachments update owner admin" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'case-attachments'
    and (
      public.current_app_role() = 'admin'
      or exists (
        select 1
        from public.cases c
        where c.id::text = (storage.foldername(name))[1]
          and c.created_by::text = auth.uid()::text
      )
    )
  )
  with check (
    bucket_id = 'case-attachments'
    and (
      public.current_app_role() = 'admin'
      or exists (
        select 1
        from public.cases c
        where c.id::text = (storage.foldername(name))[1]
          and c.created_by::text = auth.uid()::text
      )
    )
  );

create policy "case attachments delete owner admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'case-attachments'
    and (
      public.current_app_role() = 'admin'
      or exists (
        select 1
        from public.cases c
        where c.id::text = (storage.foldername(name))[1]
          and c.created_by::text = auth.uid()::text
      )
    )
  );
