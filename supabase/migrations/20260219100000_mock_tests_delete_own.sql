-- Allow users to delete their own mock_tests rows (e.g. temp section rows after merging full mock test)
create policy "Users can delete own mock tests"
  on mock_tests for delete
  to authenticated
  using (user_id = auth.uid());
