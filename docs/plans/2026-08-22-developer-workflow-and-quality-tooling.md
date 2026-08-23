# Developer Workflow, Context Optimization & Quality Gates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Install, configure, and orchestrate the recommended production-grade MCP servers, Node.js packages, and CI/CD quality gate tools to maximize LLM context efficiency and enforce automated code hygiene.

**Architecture:** Layer tools into four distinct, non-overlapping runtime phases: (1) Local AST extraction and token-bounded context packaging (Repomix, ast-grep), (2) Staged-file pre-commit gates and hygiene analysis (Lefthook, Knip), (3) Agent-level MCP connectivity (Filesystem & GitHub MCPs), and (4) Pull request quality gates and diff annotations (Reviewdog, Danger JS, PR-Agent).

**Tech Stack:** SvelteKit 2, Vite 8, TypeScript 6, Bun/Node.js, Lefthook, Repomix, ast-grep, Knip, Zod, Danger JS, Reviewdog, Model Context Protocol (MCP).

---

### Task 1: Configure Token-Optimized Context Tools (Repomix & ast-grep)

**Files:**

- Create: `repomix.config.json`
- Create: `sgconfig.yml`
- Modify: `package.json`

**Step 1: Install Repomix and ast-grep CLI**

Run:

```bash
bun add -d repomix @ast-grep/cli
```

Expected: Packages added to `devDependencies` in `package.json`.

**Step 2: Create Repomix configuration with AST-aware exclusions**

Create `repomix.config.json`:

```json
{
	"output": {
		"filePath": "repomix-output.xml",
		"style": "xml",
		"removeComments": true,
		"removeEmptyLines": true,
		"showLineNumbers": true,
		"topFilesLength": 10
	},
	"include": ["src/**", "tests/**", "scripts/**", "*.ts", "*.json"],
	"ignore": {
		"useGitignore": true,
		"useDefaultPatterns": true,
		"customPatterns": [
			".svelte-kit/**",
			".netlify/**",
			"build/**",
			"test-results/**",
			"playwright-report/**",
			"*.png",
			"*.jpg",
			"*.svg",
			"bun.lock"
		]
	},
	"security": {
		"enableSecurityCheck": true
	}
}
```

**Step 3: Create ast-grep configuration for fast structural searches**

Create `sgconfig.yml`:

```yaml
ruleDirs:
  - .ast-grep/rules
testDirs:
  - .ast-grep/tests
```

Create sample AST search directory:

```bash
mkdir -p .ast-grep/rules
```

**Step 4: Add npm scripts for context packaging and AST extraction**

Update `package.json` scripts:

```json
"context:pack": "repomix",
"ast:scan": "ast-grep scan"
```

**Step 5: Verify Repomix and ast-grep execution**

Run:

```bash
bun run context:pack
```

Expected: `repomix-output.xml` generated with file tree and token count summary.

Run:

```bash
rm -f repomix-output.xml
```

**Step 6: Commit**

```bash
git add repomix.config.json sgconfig.yml package.json bun.lock
git commit -m "chore: configure repomix and ast-grep for LLM context optimization"
```

---

### Task 2: Configure Pre-Commit Hygiene & Dead-Code Analysis (Lefthook & Knip)

**Files:**

- Create: `lefthook.yml`
- Create: `knip.jsonc`
- Modify: `package.json`

**Step 1: Install Lefthook and Knip**

Run:

```bash
bun add -d lefthook knip
```

Expected: Packages added to `devDependencies`.

**Step 2: Create Knip configuration for SvelteKit and Vite**

Create `knip.jsonc`:

```jsonc
{
	"$schema": "https://unpkg.com/knip@5/schema.json",
	"entry": [
		"src/routes/**/+{page,layout,server,error}.{js,ts,svelte}",
		"src/hooks.{server,client}.{js,ts}",
		"playwright.config.ts",
		"vite.config.ts",
		"scripts/*.ts"
	],
	"project": ["src/**/*.{js,ts,svelte}", "scripts/**/*.ts"],
	"ignore": ["src/legacy_main.js"],
	"ignoreDependencies": ["@sveltejs/adapter-auto", "@testing-library/jest-dom"]
}
```

**Step 3: Create Lefthook configuration for parallel pre-commit checks**

Create `lefthook.yml`:

```yaml
pre-commit:
  parallel: true
  commands:
    lint-format:
      glob: '*.{js,ts,svelte,json,md}'
      run: bunx prettier --check {staged_files}
    typecheck:
      run: bun run check
    knip:
      run: bunx knip --no-exit-code
```

**Step 4: Install Lefthook Git Hooks**

Run:

```bash
bunx lefthook install
```

Expected: `SYNC  hooks installed` output.

**Step 5: Verify Knip execution**

Run:

```bash
bunx knip
```

Expected: Diagnostic report listing unused exports or clean status.

**Step 6: Commit**

```bash
git add lefthook.yml knip.jsonc package.json bun.lock
git commit -m "chore: setup lefthook pre-commit hooks and knip dead-code analysis"
```

---

### Task 3: Configure MCP Servers for Agent Context & PR Inspection

**Files:**

- Create/Modify: `.vscode/mcp.json`

**Step 1: Define Scoped MCP Configuration**

Create `.vscode/mcp.json`:

```json
{
	"mcpServers": {
		"filesystem": {
			"command": "npx",
			"args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
		},
		"github": {
			"command": "npx",
			"args": ["-y", "@modelcontextprotocol/server-github"],
			"env": {
				"GITHUB_PERSONAL_ACCESS_TOKEN": "${env:GITHUB_TOKEN}"
			}
		}
	}
}
```

**Step 2: Verify MCP Server packages are resolvable**

Run:

```bash
npx -y @modelcontextprotocol/server-filesystem --help || true
```

Expected: Package downloads and shows server usage information.

**Step 3: Commit**

```bash
git add .vscode/mcp.json
git commit -m "chore: add scoped filesystem and github mcp server configs"
```

---

### Task 4: Configure PR Quality Gates (Danger JS, Reviewdog, and PR-Agent)

**Files:**

- Create: `dangerfile.ts`
- Create: `.github/workflows/ai-quality-gates.yml`
- Modify: `package.json`

**Step 1: Install Danger JS**

Run:

```bash
bun add -d danger
```

Expected: `danger` added to `devDependencies`.

**Step 2: Create Dangerfile to enforce PR diff sizes and mandatory tests**

Create `dangerfile.ts`:

```typescript
import { danger, warn, fail, message } from 'danger';

// 1. Keep PRs small to prevent LLM/human reviewer fatigue
const bigPRThreshold = 500;
const totalChanges = danger.github.pr.additions + danger.github.pr.deletions;
if (totalChanges > bigPRThreshold) {
	warn(
		`⚠️ This PR has ${totalChanges} changed lines. Consider breaking it down for higher review quality.`
	);
}

// 2. Ensure test changes when source changes
const hasAppChanges = danger.git.modified_files.some((f) => f.startsWith('src/'));
const hasTestChanges = danger.git.modified_files.some((f) => f.startsWith('tests/'));
if (hasAppChanges && !hasTestChanges) {
	warn('⚠️ Code in `src/` was modified, but no test files were updated or added.');
}

// 3. Prevent secrets or local env files from committing
const dangerousFiles = ['.env', '.env.local', 'repomix-output.xml'];
const containsDangerousFiles = danger.git.created_files.some((f) => dangerousFiles.includes(f));
if (containsDangerousFiles) {
	fail('🚨 Dangerous local file committed! Please remove .env or context dumps.');
}

// 4. Summary metrics
message(
	`📊 PR Quality Summary: +${danger.github.pr.additions} / -${danger.github.pr.deletions} across ${danger.git.modified_files.length} modified files.`
);
```

**Step 3: Create GitHub Action for AI Quality Gates & Reviewdog**

Create `.github/workflows/ai-quality-gates.yml`:

```yaml
name: AI Quality Gates & PR Review

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: write
  checks: write
  issues: write

jobs:
  danger:
    name: Danger JS PR Rules
    runs-on: ubuntu-latest
    if: github.event.pull_request.draft == false
    steps:
      - uses: actions/checkout@v5
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - name: Run Danger JS
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: bunx danger ci

  reviewdog-lint:
    name: Reviewdog Inline Annotations
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - uses: reviewdog/action-eslint@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          reporter: github-pr-review
          eslint_flags: '.'
          fail_on_error: false

  pr-agent:
    name: Qodo PR-Agent Code Review
    runs-on: ubuntu-latest
    if: github.event.pull_request.draft == false && github.actor != 'dependabot[bot]'
    steps:
      - uses: actions/checkout@v5
      - name: Run PR-Agent Review
        uses: qodo-ai/pr-agent@main
        env:
          OPENAI_KEY: ${{ secrets.OPENAI_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_AGENT.CONFIG: '{"pr_reviewer.inline_code_comments": true, "pr_reviewer.require_score_review": false}'
```

**Step 4: Commit**

```bash
git add dangerfile.ts .github/workflows/ai-quality-gates.yml package.json bun.lock
git commit -m "ci: add dangerfile quality gates and ai review workflow"
```

---

### Task 5: End-to-End Verification Pipeline

**Files:**

- Create: `scripts/verify-tooling.ts`
- Modify: `package.json`

**Step 1: Write verification script to validate tooling health**

Create `scripts/verify-tooling.ts`:

```typescript
import { execSync } from 'child_process';

console.log('🔍 Validating developer tooling suite...');

const steps = [
	{ name: 'Repomix Packaging', cmd: 'bunx repomix --version' },
	{ name: 'ast-grep Syntax Engine', cmd: 'bunx ast-grep --version' },
	{ name: 'Knip Dead Code Scanner', cmd: 'bunx knip --version' },
	{ name: 'Lefthook Hook Manager', cmd: 'bunx lefthook version' },
	{ name: 'Danger JS CLI', cmd: 'bunx danger --version' }
];

for (const step of steps) {
	try {
		const output = execSync(step.cmd, { encoding: 'utf-8' }).trim();
		console.log(`✅ ${step.name}: ${output}`);
	} catch (err) {
		console.error(`❌ Failed: ${step.name}`);
		process.exit(1);
	}
}

console.log('🎉 All developer and context tools successfully validated!');
```

**Step 2: Add verification script to package.json**

Add to `scripts` in `package.json`:

```json
"verify:tools": "bun run scripts/verify-tooling.ts"
```

**Step 3: Run the verification suite**

Run:

```bash
bun run verify:tools
```

Expected: Output showing green checkmarks for each installed CLI tool.

**Step 4: Commit**

```bash
git add scripts/verify-tooling.ts package.json
git commit -m "test: add verification script for developer workflow tools"
```
