# HHVC mockup corpus — Pass 1: structure

Scope: all 29 modules in `src/lib/data/`. Structure, typing, hierarchy, and
duplication only. Wording is Pass 2.

Method: metadata and section extraction across the corpus, not a page-by-page
read. Findings below cite the module and the count that produced them.

**Correction:** an earlier draft of this document said there was no Karl
documentation in this repo. There is — `docs/karl-export-field-map.md` (128KB),
with an `## Agency` section and a documented type register. Type findings below
that were hedged as unverifiable can be checked against it; A1 already has been
(see A1).

---

## RESOLVED — Agency approved (2026-08-29)

HHVC is approved for an Agency page. `type: 'Agency'` is correct; the **slug**
is the wrong field and moves to `/departments/`. Rename scope is in
"Agency rename — blast radius" below. The original analysis is kept for context.

---

## Blocking question — the landing page's type decides its URL

`src/lib/data/agency-service-grouping.ts` carries:

```ts
slug: 'sf.gov/topic-healthy-housing-and-vector-control',
type: 'Agency',
```

An Agency type and a `topic-` URL. These disagree, and the disagreement is not
cosmetic: Agency pages require Digital Services to create them and live under
`/departments/`. Topic pages do not. One of these two fields is wrong and which
one changes who can create the page and what its address is.

The `editorNote` shows this was deliberate, not a typo — it calls the page a
"task-first HHVC Agency landing page" and enumerates Agency-only fields left
empty (Logo, Divisions or subcommittees, People, Spotlight 1/2, Highlights).
Someone reasoned about Agency's field inventory.

**This needs a decision before anything downstream of it is worth editing**,
because every page that links to the landing page inherits its URL.

---

## URL convention — verified against the live site 2026-08-30

The `departments--` form used by the rename is **confirmed correct**, and the
way it was confirmed is worth keeping, because the two authoritative sources
appear to disagree and do not.

The Karl Editor Help Center (E3, and the declared source of truth for _how a
page should be built_) gives the Agency URL structure as:

```
sf.gov/departments/title-of-department
sf.gov/departments/title-of-department/title-of-child-department
```

A slash. But live SF.gov canonicalizes the slash form to the double dash:

```
/departments/controllers-office        -> 301 -> /departments--controllers-office
/departments/controllers-office/about  -> 301 -> /departments--controllers-office--about
/departments/department-public-health  -> 301 -> /departments--department-public-health
```

Both forms resolve; only the `--` form is canonical. So the Help Center
describes the **authoring** path in the CMS tree, and the published page renders
`--`. That is precisely the distinction `design/field-map-corrections.md`
preserves when it declines to let E3 supersede E4:

> E4 still answers a different question and is not superseded. E1 says what
> fields the editor form has; E3 says how a page should be built; E4 says what a
> published page actually renders.

**For a URL, E4 governs.** The corpus's existing `--about` suffix is therefore
correct rather than a shorthand, and the same reading settles the other types:
the Help Center's `sf.gov/topics/name-of-topic` and
`sf.gov/step-by-step/title-of-step-by-step` are authoring paths, so the corpus's
`topics--` and `step-by-step--` slugs are consistent with how those pages
publish. **A1 is a typing question only — the slugs are not evidence of a URL
defect.**

---

## Agency rename — blast radius

`routableId()` (`src/lib/corpus/pageId.ts`) strips `sf.gov/` and converts
remaining slashes to dashes, so `sf.gov/departments/healthy-housing-and-vector-control`
routes as `departments-healthy-housing-and-vector-control`. The route itself is
fine. The risk is elsewhere.

**Six places, and the DB one is the one that bites silently:**

1. `src/lib/data/agency-service-grouping.ts` — the slug.
2. `src/lib/data/about-hhvc-team.ts` — the About child moves with the parent.
   **Convention settled from evidence in the corpus, not assumed.** sf.gov uses
   a flat double-dash pattern, not path nesting: `about-hhvc-team.ts`'s
   editorNote cites `sf.gov/departments--controllers-office--about` as
   confirmed live, and the corpus already carries
   `sf.gov/departments--department-public-health--environmental-health`. So the
   existing `--about` suffix is kept rather than replaced:
   `sf.gov/departments--healthy-housing-and-vector-control--about`.
   (An earlier draft of this document proposed `/departments/<agency>/about`
   path nesting. That was wrong.)
3. `supabase/seed.sql` — lines 113 and 119.
4. `supabase/seed.hosted.sql` — lines 36 and 42.
5. **Live `pages` rows on production and staging — verified 2026-08-29.**
   `corpus:import` **never writes `public.pages`.** It writes only
   `corpus_versions` and `page_versions` (confirmed in
   `20260823120000_import_corpus_version_fn.sql` — two `INSERT` statements, neither into
   `pages`). `pages` rows are created by the **seed only**; the app never
   inserts, it only reads and updates them.

   That makes the failure a **missing row**, not an orphaned one.
   `loadReview()` populates the queue from `select * from pages where
review_id = …` (`reviewState.ts:97`), so the queue is driven by DB rows, not
   by `allPages`. Rename the corpus without migrating those rows and:

   - the two renamed pages get **no `pages` row**, so they vanish from the
     review queue and cannot take a status, note or check at all — the Agency
     landing page becomes unreviewable;
   - the two old rows linger in the queue pointing at paths the corpus no
     longer renders.

   **The `UPDATE` is required, not merely advisable.** Re-running
   `corpus:import` does not repair it.

### Live state — checked, both databases

|                                 | prod `kiynekyzqxneepjipqhg` | staging `aplbsgacqnxhzjuquvft` |
| ------------------------------- | --------------------------- | ------------------------------ |
| `pages`                         | 29                          | 29                             |
| status moved off `needs-review` | 0                           | 0                              |
| manager notes                   | 0                           | 0                              |
| page checks                     | 0                           | 0                              |
| comments                        | 0                           | 0                              |
| edits                           | 0                           | 0                              |

**No reviewer work exists in either database.** Nothing is at risk of being
lost, so the rename can go now with no data-preservation ceremony — but the two
`UPDATE`s still have to happen or the renamed pages are absent from the queue.

Paths to update in both, identical in each:

```sql
UPDATE pages SET path = 'departments--healthy-housing-and-vector-control'
 WHERE path = 'topic-healthy-housing-and-vector-control';
UPDATE pages SET path = 'departments--healthy-housing-and-vector-control--about'
 WHERE path = 'topic-healthy-housing-and-vector-control--about';
```

Shipped as `supabase/migrations/20260829120000_rename_agency_page_paths.sql`.

**Staging is not covered by the auto-apply.** Per `CLAUDE.md`, merging to `main`
applies migrations to production only. Staging (`aplbsgacqnxhzjuquvft`) needs a
manual `supabase link --project-ref aplbsgacqnxhzjuquvft && supabase db push`,
or deploy previews will render the renamed corpus against un-renamed rows.

### Agency fields that are now live decisions, not deferrals

The `editorNote` lists these as "intentionally left empty" — that was correct
while the type was unconfirmed. Now each is a real choice:

- **Highlights** — takes exactly 2 or 3, each _requiring_ an image ≥350×200 plus
  a screenreader label. The note already flags this as a real cost on this tool
  (inline WebP data URIs), not a free win.
- **Spotlight 1 / Spotlight 2** — up to 2 allowed, both unused.
- **Quick links, Call to action, Public records, Topics** — real Agency fields.
- **Divisions or subcommittees, People, Logo, Main image, Alert, Meeting
  information, Archive information.**

### Two knock-on effects on findings below

- **B3 (two landing surfaces)** is now decidable. With a real Agency page,
  `topics--healthy-housing-conditions` needs a role that is not "second front
  door" — or it merges.
- **`primary_agency`** is a required Karl field across most types in this
  corpus. HHVC being its own Agency means every HHVC page can point at HHVC
  rather than at DPH. That is a content decision to make once and apply to all 29.

---

## A. Type inconsistencies inside the corpus

### A1. Four `` slugs are typed `Transaction`

| Slug                                                      | Type        |
| --------------------------------------------------------- | ----------- |
| `sf.gov/get-ready-for-a-housing-inspection`               | Transaction |
| `sf.gov/get-ready-for-a-follow-up-inspection`             | Transaction |
| `sf.gov/fix-healthy-housing-and-vector-control-violation` | Transaction |
| `sf.gov/tenant-steps-after-notice-of-violation`           | Transaction |

**Verified against `docs/karl-export-field-map.md`: "Step by step" IS a
distinct Karl type** (`stepbystep`, line 145). The map already records the
mismatch — pages "described `Step by step`'s Step block while sitting on
Transaction and Information pages" (line 148) — and files the type under "Types
not yet in use."

So these four are typed `Transaction` while carrying `stepbystep` slugs and
Step-block content. Retyping them is a real change with real consequences
(different field inventory, different editor), not a slug tidy — it needs its
own pass.

**Added nuance from `design/karl-content-types.md`:** Step by step is "an
overview of a multi-step process over time, **max 15 steps**", and "details
belong on Transactions or Information pages." So a `stepbystep`-slugged page that
carries step _detail_ rather than an _overview_ may legitimately be a
Transaction. Check each of the four against that overview-vs-detail line before
retyping any of them — the slug alone does not settle it.

Note these are not thin pages. `respond-to-notice-of-violation.ts` shows
`heading` × 1 but holds 7 `steps` entries inside that one section, because the
Transaction editor models steps as a repeatable field rather than as sections.
Count `steps`, not headings, when judging Transaction depth.

### A2. `type: 'Report'` — CORRECTED: the type is right, only the URL is a problem

**This finding was wrong and is retracted.** `design/karl-content-types.md`
(sourced from the Karl Editor Help Center, read 2026-08-23) states:

> **Report** is for long text with a publication date. It is the only type that
> supports tables.

`health-code-article-11.ts` carries `karl: 'Report Content -> Table block'` and
is long reference text. Report is therefore the **correct** type — it is the only
one that can render the tables this page is built from, and its table of contents
generates from Heading 2s, which is why Report is the one type whose rich-text
toolbar includes H2.

What survives is only the URL observation, which is a findability point rather
than a typing error: `sf.gov/report/health-code-article-11-plain-language` sits
one segment from `sf.gov/report-rats-mice-four-legged-problems`, so the same word
carries opposite meanings — a noun (a published document) and a verb (the thing
the reader came to do) — on adjacent URLs.

### A3. Lookup pages typed three different ways for one function

| Page                                                 | Type                | Headings |
| ---------------------------------------------------- | ------------------- | -------- |
| `look-up-building-records`                           | Resource Collection | 4        |
| `find-complaints-and-inspection-records`             | Transaction         | 4        |
| `find-residential-hotel-and-shelter-records`         | Transaction         | 3        |
| `lookup-residential-health-code-violations`          | Transaction         | 3        |
| `make-a-public-records-request-environmental-health` | Transaction         | 3        |

Five paths to "find a record," typed two ways, with no stated boundary between
them. A resident who wants to know whether their building has open violations
cannot tell which of these five is theirs — and three of the five would
plausibly answer.

**Proposed fix:** `look-up-building-records` is already the odd one out as a
Resource Collection, which is the right shape for an index. Make that the
single entry point and collapse the three record lookups beneath it. Keep
`public-records-request` separate — it is a genuinely different act (a formal
request with a legal response clock, not a self-serve lookup).

---

## B. Duplication

### B1. The three report pages are one template rendered three times

`report-rats-mice-four-legged-problems`, `report-cockroaches-mosquitoes-insects`,
and `report-garbage-filth-vegetation` have **identical section headings, 5 for 5**:

```
What to do
Get help making your report
How your report is processed
While you wait: tips to help with the problem
Related pages
```

The split is by species — rats, roaches, garbage. That is symptom-organized,
which contradicts the program's own IPM root-cause logic (food, water,
harborage, entry, behavior). A resident does not arrive knowing whether their
problem is an insect problem or a filth problem; they arrive knowing they saw
something. The root cause is usually shared across all three pages, and the
current split forces it to be written three times.

This is worth a decision, not an automatic merge: three separate pages may be
correct for search (people do search "report rats"). But if they stay separate,
the shared root-cause content needs one owner, not three copies.

### B2. Two workshop Campaign pages, 7-for-7 parallel

| `integrated-pest-management-education`                    | `mosquito-education-workshop`               |
| --------------------------------------------------------- | ------------------------------------------- |
| Learn how to prevent pests without heavy pesticide use    | Bring mosquito science to your students     |
| Who can request a session                                 | Who can request a workshop                  |
| What you'll learn                                         | What students experience                    |
| Grounded in San Francisco health code and UC IPM guidance | Aligned with California education standards |
| Request a session                                         | Request a workshop                          |
| Questions before you request                              | Questions before you apply                  |
| Related pages                                             | Related pages                               |

These serve genuinely different audiences (property managers vs. schoolchildren),
so this is probably correct as two pages. Flagging it so the parallelism is a
decision rather than an accident: confirm these are two programs, not one
program with two audiences.

### B3. Two landing surfaces with an unstated boundary

`departments--healthy-housing-and-vector-control` (6 sections) and
`topics--healthy-housing-conditions` (5 sections). Both are top-of-funnel. The
boundary between them is not stated on either page. Resolve alongside the
blocking question above, since the answer changes what the first one is.

---

## C. Gaps

### C1. Mold has no findable home — highest-impact finding

Mold is in the program's own front-door language. The landing page carries a
card titled **"Get help with pests, mold, or trash through 311."**

Mold content actually lives in `report-garbage-filth-vegetation.ts`, which
mentions it **28 times** and contains sections titled "Report mold from humidity
or condensation" and "For mold, identify the moisture source."

But the page is titled **"Report garbage, filth, and overgrown vegetation."**
Mold appears nowhere in its title, and nowhere in any other page's title.

A tenant with mold on their bathroom ceiling will not click "garbage, filth, and
overgrown vegetation." They will search, find nothing that names their problem,
and either call 311 blind or give up. The content exists and is unreachable by
the person it was written for.

**Fix:** name mold in the title. `Report mold, garbage, and filth` — or split
mold out, given it has enough substance for its own page and a distinct root
cause (moisture) that the other conditions on that page don't share.

### C2. Committed timeframes are almost absent

Across all 29 pages, only three distinct timeframes appear:

```
within 72 hours   ×5
within 30 days    ×3
within 3 days     ×2
```

Ten instances total, across a corpus whose whole subject is inspection and
enforcement. Most pages tell a user what will happen but never when.

This fails on both axes at once. As UX it leaves "what happens next" without a
clock, which is the single thing a tenant waiting on an inspection most wants.
As enforcement alignment, a deadline that is not stated is not verifiable at
inspection — and Article 11 correction deadlines are exactly the kind of fact
that has to be specific and observable.

Confirm which timeframes HHVC can actually commit to, then state them
everywhere they apply. Where none can be committed, say what governs the timing
instead of staying silent.

### C3. Pages with no next-step content

Zero matches for next-step or timeline phrasing anywhere in the body:

| Page                                           | Why it matters                                                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `public-records-request`                       | A formal request with no statement of what follows. The user submits and hears nothing about response time or format. |
| `find-inspector-by-neighborhood`               | Ends at a name. No statement of what to do with it.                                                                   |
| `lookup-residential-hotel-records`             | Lookup with no onward path.                                                                                           |
| `lookup-residential-violations`                | Same.                                                                                                                 |
| `integrated-pest-management-property-managers` | 10 sections of guidance, no stated next action.                                                                       |
| `mosquito-education-workshop`                  | Request path with no confirmation expectation.                                                                        |
| `integrated-pest-management-education`         | Same.                                                                                                                 |

`about-hhvc-team` also scores zero and that is fine — About pages don't owe a
next step.

`respond-to-notice-of-violation` scores zero on the phrasing but its Step 5 is
"Finish the work or respond to further enforcement," so the consequence is
covered even though the next-step language isn't. Treat as a wording item for
Pass 2, not a structural gap.

---

## D. Party attribution — the pages to read closely in Pass 2

Tenant and owner duties must never blur. These pages address both parties
substantially, so they are where blurring would occur:

| Page                                           | owner/mgr mentions | tenant mentions |
| ---------------------------------------------- | ------------------ | --------------- |
| `integrated-pest-management-property-managers` | 28                 | 3               |
| `report-cockroaches-mosquitoes-insects`        | 16                 | 8               |
| `report-rats-mice-four-legged-problems`        | 16                 | 8               |
| `article-11-compliance-for-property-owners`    | 15                 | 5               |
| `report-garbage-filth-vegetation`              | 13                 | 9               |
| `healthy-housing-vermin-resources`             | 11                 | 6               |
| `tenant-rights-reporting`                      | 4                  | 17              |

One instance already visible: `respond-to-notice-of-violation` Step 2 mixes
both parties in a single bullet list ("Owners and managers may need to…" /
"Tenants may need to…"). That may be correct, since one notice can cite both —
but it is the page an owner reads under deadline pressure, and a mixed list is
where someone reads past the bullet that was theirs. Pass 2 should check whether
these need splitting under party-specific subheads.

---

## Recommended order for Pass 2

1. Resolve the Agency/Topic blocking question — it gates the landing page and
   every link into it.
2. Fix mold findability (C1). Cheapest high-impact change in the corpus.
3. Decide the lookup collapse (A3) and the report-page split (B1) — both are IA
   decisions that change what Pass 2 has to edit.
4. Confirm committed timeframes (C2), then page-by-page wording with party
   attribution (D) as the standing check.
