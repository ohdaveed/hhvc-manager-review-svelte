/**
 * Conventional commits, enforced.
 *
 * The global CLAUDE.md mandates them and nothing checked, so the convention
 * held only as long as whoever was committing remembered it. lefthook already
 * owned the hook surface, so this is a commit-msg entry and a config file.
 */
export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		// The default 100 rejects commit messages this repo already writes: its
		// history explains *why* a change was made, which is the part worth
		// keeping. Only the subject line stays short.
		'body-max-line-length': [0, 'always'],
		'footer-max-line-length': [0, 'always']
	}
};
