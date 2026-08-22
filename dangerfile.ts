import { danger, warn, fail, message } from 'danger';
// Plain JS on purpose -- see the note in that file. Danger rewrites a `.ts`
// specifier to `.js` when it transpiles this Dangerfile, so a sibling
// TypeScript module cannot be resolved here without a build step.
import { hasSourceChanges, hasTestChanges, touchedFiles } from './scripts/danger-rules.js';

// 1. Keep PRs small to prevent LLM/human reviewer fatigue
const bigPRThreshold = 500;
const totalChanges = danger.github.pr.additions + danger.github.pr.deletions;
if (totalChanges > bigPRThreshold) {
	warn(
		`⚠️ This PR has ${totalChanges} changed lines. Consider breaking it down for higher review quality.`
	);
}

// 2. Ensure test changes when source changes
const touched = touchedFiles(danger.git);
if (hasSourceChanges(touched) && !hasTestChanges(touched)) {
	warn('⚠️ Code in `src/` was modified, but no test files were updated or added.');
}

// 3. Prevent secrets or local context dumps from committing
const dangerousFiles = ['.env', '.env.local', 'repomix-output.xml'];
const containsDangerousFiles = danger.git.created_files.some((f) => dangerousFiles.includes(f));
if (containsDangerousFiles) {
	fail('🚨 Dangerous local file committed! Please remove .env or context dumps.');
}

// 4. Summary metrics
message(
	`📊 PR Quality Summary: +${danger.github.pr.additions} / -${danger.github.pr.deletions} across ${danger.git.modified_files.length} modified files.`
);
