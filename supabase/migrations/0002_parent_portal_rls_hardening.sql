-- =============================================================================
-- 0002_parent_portal_rls_hardening.sql
--
-- Closes four gaps found while redesigning the Parent Portal. REVIEW BEFORE RUNNING.
--
-- Uses RESTRICTIVE policies: they only ADD a "parents may not ..." condition on top of your
-- existing permissive policies. No existing policy is modified or dropped, staff/admin behaviour is
-- unchanged, and everything can be undone with the ROLLBACK block at the bottom.
-- Safe to re-run (each policy is dropped-if-exists first).
--
--   1. Parents could INSERT / UPDATE / DELETE school configuration
--      (staff, academic_years, classes, streams, subjects, terms) because the
--      "... same school" policies are FOR ALL with no role check.
--   2. Parents could read every profile in their school (names, phones, photos of other
--      parents and staff). Now a parent can only read their own profile row.
--   3. Parents could read exam results before the school released them. Now only results of
--      exams with status 'Results Released' are visible to a parent.
--   4. Parents could read draft / scheduled / cancelled notifications. Now only sent ones.
--
-- NOT covered here: parents can still SELECT staff rows (the portal needs teacher names for the
-- timetable and class teacher). RLS can't hide columns, so sensitive staff columns (salary,
-- national ID, KRA PIN, ...) remain readable to parents. See the note at the end of this file.
-- =============================================================================

-- 1. Parents are read-only on school configuration tables ---------------------
do $$
declare t text;
begin
  foreach t in array array['staff','academic_years','classes','streams','subjects','terms'] loop
    execute format('drop policy if exists %I on public.%I', 'eduke parents cannot insert '||t, t);
    execute format('drop policy if exists %I on public.%I', 'eduke parents cannot update '||t, t);
    execute format('drop policy if exists %I on public.%I', 'eduke parents cannot delete '||t, t);

    execute format($f$create policy %I on public.%I as restrictive for insert
      with check (my_role() is distinct from 'parent'::user_role)$f$, 'eduke parents cannot insert '||t, t);
    execute format($f$create policy %I on public.%I as restrictive for update
      using (my_role() is distinct from 'parent'::user_role)
      with check (my_role() is distinct from 'parent'::user_role)$f$, 'eduke parents cannot update '||t, t);
    execute format($f$create policy %I on public.%I as restrictive for delete
      using (my_role() is distinct from 'parent'::user_role)$f$, 'eduke parents cannot delete '||t, t);
  end loop;
end $$;

-- 2. Parents can only read their own profile ----------------------------------
drop policy if exists "eduke parents read own profile only" on public.profiles;
create policy "eduke parents read own profile only" on public.profiles
  as restrictive for select
  using (my_role() is distinct from 'parent'::user_role or id = auth.uid());

-- 3. Parents only see RELEASED exam results -----------------------------------
drop policy if exists "eduke parents see released results only" on public.exam_results;
create policy "eduke parents see released results only" on public.exam_results
  as restrictive for select
  using (
    my_role() is distinct from 'parent'::user_role
    or exists (
      select 1 from public.exams e
      where e.id = exam_results.exam_id and e.status = 'Results Released'
    )
  );

-- 4. Parents only see notifications that were actually sent -------------------
drop policy if exists "eduke parents see sent notifications only" on public.notifications;
create policy "eduke parents see sent notifications only" on public.notifications
  as restrictive for select
  using (
    my_role() is distinct from 'parent'::user_role
    or (status in ('Sent', 'Partially Failed') and is_platform_broadcast = false)
  );

-- =============================================================================
-- ROLLBACK (run this to undo everything above)
-- =============================================================================
-- do $$
-- declare t text;
-- begin
--   foreach t in array array['staff','academic_years','classes','streams','subjects','terms'] loop
--     execute format('drop policy if exists %I on public.%I', 'eduke parents cannot insert '||t, t);
--     execute format('drop policy if exists %I on public.%I', 'eduke parents cannot update '||t, t);
--     execute format('drop policy if exists %I on public.%I', 'eduke parents cannot delete '||t, t);
--   end loop;
-- end $$;
-- drop policy if exists "eduke parents read own profile only" on public.profiles;
-- drop policy if exists "eduke parents see released results only" on public.exam_results;
-- drop policy if exists "eduke parents see sent notifications only" on public.notifications;

-- =============================================================================
-- FOLLOW-UP (not applied here): hiding sensitive staff columns from parents
-- =============================================================================
-- Parents need only first_name / last_name from staff. The clean fix is a small view exposing just
-- those columns (with security_invoker off, filtered to the caller's school) and pointing the two
-- parent queries at it (timetable teacher, class teacher). Ask if you'd like me to prepare that.
