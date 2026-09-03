---
name: hhvc-supabase-migrations-audit-and-apply
description: 'Audit Supabase migrations against best practices, identify and fix findings, and safely coordinate application across development, staging, and production environments. Use this skill when auditing Supabase migrations against best practices, identifying findings that need fixing, writing and testing migrations, and coordinating their application across development, staging, and production.'
trigger: 'Use this skill when auditing Supabase migrations against best practices, identifying findings that need fixing, writing and testing migrations, and coordinating their application across development, staging, and production.'
author: arrizon.david
source_sessions:
  - arrizon.david_arrizon.david's Organization_default_bbe13a83-bd8e-43ce-8723-90ff7ffd6933
  - arrizon.david_arrizon.david's Organization_default_82e22940-3934-47f6-ab65-a4a62e07a3f9
contributors:
  - arrizon.david
version: 1
created_by_agent: claude_code
created_at: 2026-08-28T11:57:47.105Z
updated_at: 2026-08-28T11:57:47.105Z
---

# HHVC Supabase Migrations: Audit and Apply Workflow

## When to Use This Skill

Use this skill when:

- Auditing existing Supabase migrations against best practices
- Identifying database schema issues, constraint problems, or RLS policy gaps
- Writing and testing migrations to fix those issues
- Coordinating application of migrations across local dev, staging, and production

## The Audit and Apply Workflow

### 1. Load and Audit Against Best Practices

Load the `supabase-postgres-best-practices` skill. It provides rule categories and reference files covering security (RLS, privileges), schema design (data types, FKs, indexes), queries, and performance.

Audit existing migrations in `supabase/migrations/`. For this repo, focus on:

- `security-rls-basics`, `security-rls-performance` — policies and their indexes
- `schema-foreign-key-indexes` — all FKs must have indexes covering filter columns
- `data-pagination` — PostgREST caps at `max_rows` (default 1000); queries need explicit limit/pagination
- `security-privileges` — grants mirror RLS policies, no `GRANT ALL`

### 2. Identify and Categorize Findings

Group findings by severity and category:

- **Correctness bugs** — wrong result or silent failure (e.g., truncated query results)
- **Constraint violations** — overlapping policies, missing constraints, broken assumptions
- **Performance gaps** — missing indexes, N+1 patterns
- **Security** — exposed functions, broken RLS, privilege leaks

### 3. Write Migration Files

```sh
supabase migration new <descriptive-name>
```

Do not invent filenames. For iterating freely on your local database before committing to a migration file, use `supabase db query` or `execute_sql` (MCP) rather than `apply_migration` (which writes a history entry on every call and prevents iteration).

When ready, use `supabase db pull <name>` to generate a clean migration file.

**For constraint changes involving existing rows:**

```sql
-- Check for conflicts before applying constraint
DO $$
  DECLARE offending TEXT;
BEGIN
  SELECT STRING_AGG(path, ', ')
    INTO offending
    FROM pages
    GROUP BY review_id, path
    HAVING COUNT(*) > 1;
  IF offending IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate paths on same review: %', offending;
  END IF;
END $$;

ALTER TABLE pages
  ADD CONSTRAINT pages_review_id_path_key UNIQUE (review_id, path);
```

### 4. Dry-Run Verify on Shadow Database

```sh
bunx supabase db diff --local
```

Recreates the schema from scratch and applies all migrations in order, catching ordering issues and syntax errors. The diff shows what would change on your current dev database — an inverse of the new migrations.

Expected output: only the changes you added, nothing else.

### 5. Apply to Local Dev

```sh
bunx supabase db push --local
```

Brings your dev database in line without wiping review data.

### 6. Apply to Staging

Verify staging is the linked target:

```sh
cat supabase/.temp/project-ref
# Expected: aplbsgacqnxhzjuquvft (staging for this repo)
```

```sh
bunx supabase db push
```

Interactively confirms and prompts for the database password. Staging is free-tier; it pauses after ~7 days idle — wake it from the dashboard if the connection fails.

### 7. Precondition Check for Production

Before merging (which auto-applies to production), use a dedicated worktree
that no other session uses, then **switch to production and verify the link
took** before running anything against it. `supabase link` writes a
checkout-wide `supabase/.temp/project-ref`, so whichever project was linked
last is what an unqualified command hits — and in this repo that is usually
staging, because staging is the one synced by hand. The dedicated worktree also
ensures an interruption cannot leave a shared checkout pointed at production.


```sh
bunx supabase link --project-ref kiynekyzqxneepjipqhg
cat supabase/.temp/project-ref
# Expected: kiynekyzqxneepjipqhg (production for this repo)
```

Then, while production is still linked, verify no data conflicts:

```sql
SELECT review_id, path, COUNT(*)
  FROM pages
  GROUP BY review_id, path
  HAVING COUNT(*) > 1;
-- Expected: 0 rows (or whatever your constraint allows)
```

Restore the staging link afterwards, including if the check fails or is
interrupted, or the next hand-run `db push` goes to production:

```sh
bunx supabase link --project-ref aplbsgacqnxhzjuquvft
```

A separate worktree sidesteps this entirely — `supabase/.temp/` is
per-worktree, so a link there cannot move the shared checkout's target.

### 8. Merge to Main (Production Auto-Apply)

A Supabase GitHub App integration applies pending migrations to **production only** on merge to `main`. Staging is not covered — the integration targets `kiynekyzqxneepjipqhg` (production) exclusively.

**Consequences:**

- The merge is the production apply; CI/Netlify do not apply migrations
- Staging must be pushed by hand (step 6)
- `verify:live` cannot detect schema issues; all gates pass against a frontend that queries missing views

After merge, verify production caught up:

```sh
supabase link --project-ref kiynekyzqxneepjipqhg  # if needed
supabase db push --dry-run
# Expected: 0 migrations pending
```

### 9. Update CLAUDE.md and Code Comments

If migrations fix stale reasoning:

- Update comments in `src/**/*.ts` / `src/**/*.svelte` that cite old constraints
- Update `CLAUDE.md` if behavior changes affect documented workflows
- Update `PLAN.md` with completed findings

Example: dropping `NOT NULL` on a column invalidates comments saying "the column can never be null"; replace with the actual enforcement mechanism (RLS, trigger, etc.).

### 10. Verify and Close

```sh
bun run verify           # Local tests + build
bun run verify:live      # Live artifact + deployed commit match
```

Both must pass before closing the work.

## Gotchas

- **Auto-migration is production-only** — staging always needs manual push, done at step 6 before the merge
- **Staging pauses after ~7 days idle** — free-tier behavior; wake from Supabase dashboard
- **`supabase/.temp/project-ref` determines the link target** — check it before any `db push` to avoid the wrong environment
- **Dry-run recreates schema from scratch** — it rebuilds in a shadow DB, so state differs from your current database
- **`verify:live` cannot catch schema issues** — green gates prove the frontend deployed, not that the schema is correct
- **New NOT NULL, UNIQUE, or FK constraints can fail if existing rows violate them** — backfill or validation is often needed
- **Multiple findings may need careful ordering** — dropping one constraint and adding a different one in the same migration requires testing
- **Code comments that cite constraints become stale fast** — audit them alongside the schema changes
