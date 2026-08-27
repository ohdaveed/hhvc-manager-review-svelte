-- Constraint gaps found by auditing the migrations against
-- supabase-postgres-best-practices' schema-constraints rule.
--
-- Three unrelated fixes, grouped because all three are table DDL and all three
-- state an invariant the code already assumes.

-- ---------------------------------------------------------------------------
-- 1. edits.user_id / comments.user_id: ON DELETE CASCADE -> ON DELETE SET NULL
-- ---------------------------------------------------------------------------
-- 20260822030000 deliberately withholds UPDATE and DELETE policies on `edits`
-- so that no reviewer can rewrite or destroy another's work: the table is
-- append-only, last-write-wins, which is how HelpPanel folds it. But
-- 20260822010000 created both user_id columns as
-- `REFERENCES auth.users(id) ON DELETE CASCADE`, so removing a reviewer from
-- auth.users deletes every edit and comment they ever wrote. The policies said
-- durable record; the foreign key said disposable.
--
-- SET NULL keeps the rows and lets the deletion succeed. RESTRICT was the
-- alternative and was rejected: it makes offboarding a reviewer fail with
-- 23503 until someone clears their rows by hand, every time.
--
-- Dropping NOT NULL does not weaken authorship at write time. The INSERT
-- policies still carry `WITH CHECK ((select auth.uid()) = user_id)`, and
-- `NULL = auth.uid()` evaluates to NULL rather than true, so no client can
-- write an unauthored row. user_id goes NULL only later, when the author's
-- account is removed.
--
-- On comments it also freezes the orphan rather than releasing it:
-- comments_update_own and comments_delete_own both test
-- `(select auth.uid()) = user_id`, which matches nobody once the column is
-- NULL.

ALTER TABLE edits ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE comments ALTER COLUMN user_id DROP NOT NULL;

-- Both constraints were created inline by CREATE TABLE and so carry Postgres's
-- generated name -- but resolve it from the catalog rather than assuming
-- `<table>_user_id_fkey`. A hardcoded `DROP CONSTRAINT IF EXISTS` against a
-- name that turned out to be different is silent, and the ADD below would then
-- leave the table carrying BOTH the old CASCADE constraint and the new one.
DO $$
DECLARE
    t text;
    c text;
BEGIN
    FOREACH t IN ARRAY ARRAY['edits', 'comments'] LOOP
        SELECT con.conname INTO c
        FROM pg_constraint con
        JOIN pg_attribute att
          ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
        WHERE con.contype = 'f'
          AND con.conrelid = ('public.' || t)::regclass
          AND att.attname = 'user_id'
          AND array_length(con.conkey, 1) = 1;

        IF c IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t, c);
        END IF;

        EXECUTE format(
            'ALTER TABLE public.%I ADD CONSTRAINT %I '
            'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL',
            t, t || '_user_id_fkey'
        );
    END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. pages: UNIQUE (review_id, path)
-- ---------------------------------------------------------------------------
-- The invariant is already assumed everywhere it matters. Both seeds guard
-- their inserts with `WHERE NOT EXISTS (... review_id = ... AND path = ...)`,
-- and scripts/sync-checks.ts expects `.eq('review_id', ...).eq('path', ...)`
-- to address exactly one row. page_versions states the same shape as a
-- constraint -- `UNIQUE (corpus_version_id, path)` in 20260823060000 -- and
-- pages never did.
--
-- Without it a duplicated path is two rows carrying divergent status and
-- manager_notes, and the queue renders the page twice, with nothing erroring.
--
-- The unique index also serves sync-checks.ts's two-column match directly,
-- where pages_review_id_idx could only narrow to the review before filtering.

-- Fail with the offending paths named rather than with a bare 23505. This
-- migration cannot run against a database that already violates the invariant,
-- and "could not create unique index" does not say which rows to go and fix.
DO $$
DECLARE
    dupes text;
BEGIN
    SELECT string_agg(format('%s (review_id %s, %s rows)', d.path, d.review_id, d.n), E'\n  ')
    INTO dupes
    FROM (
        SELECT review_id, path, count(*) AS n
        FROM pages
        GROUP BY review_id, path
        HAVING count(*) > 1
    ) d;

    IF dupes IS NOT NULL THEN
        RAISE EXCEPTION E'pages already violates UNIQUE (review_id, path):\n  %', dupes
            USING HINT = 'Merge or delete the duplicates -- each row may carry its own status and manager_notes -- then re-run this migration.';
    END IF;
END
$$;

-- Idempotent in the style of 20260822020000: Postgres has no
-- ADD CONSTRAINT IF NOT EXISTS, so check the catalog before adding it.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pages_review_id_path_key'
          AND conrelid = 'public.pages'::regclass
    ) THEN
        ALTER TABLE public.pages
            ADD CONSTRAINT pages_review_id_path_key UNIQUE (review_id, path);
    END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 3. reviews.status: NOT NULL, with the default stated
-- ---------------------------------------------------------------------------
-- pages.status got `NOT NULL DEFAULT 'needs-review'` plus a CHECK in
-- 20260822020000. reviews.status was left as `TEXT DEFAULT 'draft'` --
-- nullable, so a row written with an explicit NULL carries a status no reader
-- can interpret.
--
-- No CHECK constraint here, deliberately. pages.status has one because its
-- four values are the queue's vocabulary and ReviewQueue depends on them.
-- reviews has exactly one value in existence -- 'draft', written by both seeds
-- via scripts/gen-seed.ts -- and nothing in the app reads the column at all,
-- so any list of permitted states would be invented rather than observed. The
-- CHECK belongs with the first real review lifecycle, not ahead of it.

UPDATE reviews SET status = 'draft' WHERE status IS NULL;

ALTER TABLE reviews
    ALTER COLUMN status SET DEFAULT 'draft',
    ALTER COLUMN status SET NOT NULL;
