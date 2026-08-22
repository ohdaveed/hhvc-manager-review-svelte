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
