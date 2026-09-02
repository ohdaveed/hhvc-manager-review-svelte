---
name: hhvc-content-structure-audit
description: 'Systematically audit corpus, schema, and field coverage; document findings in structured form; coordinate cross-session changes; and make informed decisions about content structure — before committing, to understand coverage gaps, constraint violations, content loss, and whether human decisions are needed. Use this skill when preparing to change page types, rename slugs, add schema fields, or refactor content structure in the corpus — before committing, to understand coverage gaps, constraint violations, content loss, and whether human decisions are needed.'
trigger: 'Use this skill when preparing to change page types, rename slugs, add schema fields, or refactor content structure in the corpus — before committing, to understand coverage gaps, constraint violations, content loss, and whether human decisions are needed.'
author: arrizon.david
source_sessions:
  - arrizon.david_arrizon.david's Organization_default_25b29e61-75cd-4d31-af6e-26a6fe717f3e
  - arrizon.david_arrizon.david's Organization_default_6a758eaf-4166-4b4c-ac89-ed89426edc77
  - arrizon.david_arrizon.david's Organization_default_acd2a71a-79ac-46df-9176-9d9b399e830a
  - arrizon.david_arrizon.david's Organization_default_e7a876c8-b35b-4593-ad3e-860f65882f7a
  - arrizon.david_arrizon.david's Organization_default_5e5c87b5-b68c-4201-b4fd-aec6e80a7d75
contributors:
  - arrizon.david
version: 2
created_by_agent: claude_code
created_at: 2026-08-30T22:21:55.513Z
updated_at: 2026-09-02T04:42:16.884Z
---

# HHVC Content Structure Audit

Before modifying the corpus schema, page types, or content mappings, audit the current state systematically. The audit answers three questions: _What breaks?_ _What content is at risk?_ _What human decisions does this require?_ Document findings in structured form and coordinate with concurrent work.

## When to Use This Skill

Use this skill when:

- Preparing to retype pages to a different content type
- Renaming page slugs or restructuring the corpus
- Adding new fields to the schema and deciding which pages are affected
- Modifying Karl field mappings or checking compliance against the CMS form
- Evaluating whether a schema change has downstream costs in production storage
- Documenting audit findings to stakeholders or coordinating schema changes across sessions

## The Audit Process

### 1. Measure current coverage

Build an inventory of what currently exists across all pages.

```bash
echo "const allPages = " > /tmp/check.ts
cat src/lib/data/index.ts | grep export | wc -l
bun run tsx -e "import {allPages} from 'src/lib/data';
  allPages.forEach(p => console.log(p.slug, p.type, p.sections.length))"
```

Record findings in structured format (CSV, YAML, or markdown table). Include: page identifier, type, section/field counts, coverage of optional fields, constraint violations.

### 2. Check schema constraints

Verify the target schema can hold the content currently on the page. Trace each piece of content to its target — do not guess.

### 3. Trace content loss or risk

For each piece of content at risk, decide: **migrate, fold, or drop**.

```bash
git log --oneline src/lib/data/ | head -5
doppler run --project hhvc-svelte --config prd -- \
  psql "$SUPABASE_DB_URL" \
  -c "SELECT slug, status, manager_notes FROM reviews \
       WHERE slug IN ('...');"
```

If restricted visibility blocks checks, record it as an open gate instead of routing around it.

### 4. Identify human-facing content decisions

When content has nowhere to land, **stop and surface the decision**, don't guess a migration. Specify the decision and the cost of each option.

### 5. Test with pinned assertions

After the change, assert counts that should be stable — don't let drift silently.

```typescript
const EXPECTED = {
	calloutTitles: 4,
	o3Violations: 3,
	orphans: 5,
	thingsToKnowOver2: 8
};

test('corpus audits match expectations', () => {
	const count = allPages.flatMap((p) => p.sections).filter((s) => s.callout?.title).length;
	expect(count).toBe(EXPECTED.calloutTitles, 'audit baseline drifted; review before updating');
});
```

### 6. Check authoritative sources, not documentation

When schema or naming is in question, check the source of truth. Precedence: CMS form (live, authoritative) > field map (in-repo) > Help Center (reference only).

### 7. Measure before deciding

When blocked on "will this break something?", audit on paper first. Measure the corpus, not the map.

## Documenting and Coordinating Audit Findings

### 8. Create structured audit documentation

Package findings so stakeholders can review and future audits can detect drift:

```bash
# Example: CSV with consistent columns across rows
# Page, Type, Native, Custom, Section, Coverage Issues
# 62 rows across 14 pages, one row per unit
```

Structure should enable automated drift detection: one row per unit, same column count, decision-tracking columns. Example: `docs/karl-transaction-compliance.csv` — 62 rows, 6 fields, measurable against future corpus states.

### 9. Handle cross-session coordination

When multiple sessions work on related changes:

```bash
git fetch --prune
git rev-list --left-right --count main...origin/main
if main has moved, git merge origin/main  # don't rebase open PRs
```

Record decisions and reasoning so concurrent work doesn't re-open settled questions (see step 11).

### 10. Iterate audit findings with verification

When feedback surfaces errors, re-measure from the source:

```bash
bun run tsx -e "import {allPages} from 'src/lib/data';
  // Re-run your measurement logic
  console.log(results)"
```

Compare against prior document. Two-way verification (your measurement + peer review) catches more than one-way. Record corrections with evidence — exact file, commit, or grep line.

### 11. Document decisions and reasoning

For each finding requiring a human choice, record what is blocked, which step is available, and why:

```markdown
**U27 — Classifier limitation**
Step 1: Available — KARL_PANELS has 105 structured matchers
Step 2: Blocked — needs block internals, only available as 110 prose strings
Blocked-on: Step 1 available now; step 2 is a Karl data-model decision
```

This prevents the next person from re-opening settled decisions. Include: what is actually blocked (not just "needs refactor"), which step is available vs. deferred, the data-model constraint that applies, how to revisit.

## Gotchas

- **Structured documentation is fragile** — row counts validate shape, not semantic correctness. Verify content after splits or merges.
- **Concurrent sessions invalidate measurements** — re-measure after merges rather than assuming priors hold.
- **Decisions get inherited by new pages** — pin expected counts in tests, so new pages that violate old decisions turn CI red.
- **Slack in spec creates ambiguity** — comments might count different things than your audit (page-level vs. section-level). Ask before assuming equivalence.
- **Restricted visibility on prod checks** — `SUPABASE_DB_URL` and related secrets cannot be read; record this as an open gate rather than routing around it.

## Example: Audit to Decision Workflow

From HHVC #103–#116:

1. **Audit step 1**: Measured 14 Transaction pages, 47 sections — complete census
2. **Step 7**: Measure before deciding — `things_to_know` cap: editorial or schema-enforced?
3. **Doc step 8**: Created `docs/karl-transaction-compliance.csv` — 62 rows, 6 fields
4. **Step 9**: PR opened, cross-session peer merges concurrent work (#97 adds new pages)
5. **Step 10**: Re-measured — now 16 pages, 51 sections; two findings proved stale
6. **Step 11**: Recorded that `U27` has two substeps: one available (structured panels), one blocked (data-model decision)
7. **Step 4 closure**: Decided `things_to_know` is editorial, no publishing blocker

Every decision is on the record with its evidence and causal chain recorded for the next audit.
