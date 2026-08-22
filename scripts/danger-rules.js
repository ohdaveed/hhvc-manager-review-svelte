/**
 * Pure predicates behind the Dangerfile rules.
 *
 * They live here rather than in `dangerfile.ts` so they can be unit tested:
 * importing the Dangerfile pulls in the `danger` runtime globals, which only
 * exist inside `danger ci`.
 *
 * Plain JS with JSDoc types, deliberately. Danger transpiles `dangerfile.ts`
 * and hands the result to Node's ESM resolver, rewriting a `./x.ts` specifier
 * to `./x.js` while an extensionless one fails outright -- so a sibling
 * TypeScript module cannot be imported from the Dangerfile without adding a
 * build step. A `.js` module resolves in both Danger and Vitest as-is.
 */

/** Vitest's two projects put tests in different trees -- `src/**` runs in the
 *  server project, `tests/**` in the client one -- so a test file is
 *  identified by its name, not its directory. */
const TEST_FILE = /\.(test|spec)\.[jt]s$/;

/**
 * @param {string} path
 * @returns {boolean}
 */
export function isTestFile(path) {
	return TEST_FILE.test(path);
}

/**
 * Application code, excluding the tests that sit alongside it in `src/`.
 * @param {readonly string[]} files
 * @returns {boolean}
 */
export function hasSourceChanges(files) {
	return files.some((f) => f.startsWith('src/') && !isTestFile(f));
}

/**
 * @param {readonly string[]} files
 * @returns {boolean}
 */
export function hasTestChanges(files) {
	return files.some(isTestFile);
}

/**
 * Every path the PR touched.
 *
 * `modified_files` alone misses a brand new test: adding one lands in
 * `created_files`, so a PR that shipped a new test file was told it had none.
 *
 * @param {{ modified_files: readonly string[], created_files: readonly string[] }} git
 * @returns {string[]}
 */
export function touchedFiles(git) {
	return [...git.modified_files, ...git.created_files];
}
