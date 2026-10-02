-- Creating a World failed: the app inserts and reads the new row back in one
-- statement (insert ... returning), and can_view_world() looks the World up
-- with its own query, which can't see a row the same statement is inserting.
-- The owner check now sits in the policy itself (as it does for gems).
drop policy if exists "Worlds: view" on public.worlds;
create policy "Worlds: view" on public.worlds for select to authenticated using (owner_id = auth.uid() or public.can_view_world(id));
