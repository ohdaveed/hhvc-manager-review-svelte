import { execSync } from 'child_process';

console.log('🔍 Validating developer tooling suite...\n');

const steps = [
	{ name: 'Repomix Packaging', cmd: 'bunx repomix --version' },
	{ name: 'ast-grep Syntax Engine', cmd: 'bunx ast-grep --version' },
	{ name: 'Knip Dead Code Scanner', cmd: 'bunx knip --version' },
	{ name: 'Lefthook Hook Manager', cmd: 'bunx lefthook version' },
	{ name: 'Danger JS CLI', cmd: 'bunx danger --version' }
];

let allPassed = true;

for (const step of steps) {
	try {
		const output = execSync(step.cmd, { encoding: 'utf-8' }).trim();
		console.log(`✅ ${step.name.padEnd(26)} : ${output}`);
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err);
		console.error(`❌ ${step.name.padEnd(26)} : FAILED (${reason})`);
		allPassed = false;
	}
}

if (!allPassed) {
	console.error('\n❌ Tooling suite validation failed.');
	process.exit(1);
}

console.log('\n🎉 All developer, context optimization, and quality tools successfully validated!');
