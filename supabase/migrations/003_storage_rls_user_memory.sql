-- Dashboard / Phase 4 web: authenticated users may access only `{auth.uid()}/*` in bucket user-memory.
-- MCP server continues using the service role (bypasses these policies).

CREATE POLICY "user_memory_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-memory'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "user_memory_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-memory'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "user_memory_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-memory'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "user_memory_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-memory'
  AND split_part(name, '/', 1) = auth.uid()::text
);
