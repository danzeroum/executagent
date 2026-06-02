# Database tests (pgTAP)

Security-critical regression tests, run against a database with all migrations applied.

```bash
supabase test db            # local stack (CI)
# or, against any prepared DB:
pg_prove -d "$DATABASE_URL" supabase/tests/*.sql
```

- `rls_idor_test.sql` — proves RLS ownership isolation (a user cannot read another
  user's tasks/artifacts → the IDOR fix / generic-404 behavior), that soft-deleted rows
  vanish from their owner, and that `routing_embeddings` is service_role-only.

These assertions were also verified directly against the hosted `executagent` project when
migration 0008 was applied; this file keeps them green for every future change.
