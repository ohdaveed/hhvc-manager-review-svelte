# Restore jsdom storage in the client test project

2026-11-27

## Problem

Eleven tests in `tests/pageData.test.ts` (the `rails` and `present` blocks)
fail on Node 26 and pass on older Node. All eleven fail in `beforeEach`, before
any assertion:

```
TypeError: Cannot read properties of undefined (reading 'clear')
  at tests/pageData.test.ts:199  localStorage.clear();
```

The rail behaviour and the tests agree. The failure is in the environment.

## Cause

Node 25 and later define a global `localStorage` (Web Storage). Without a
`--localstorage-file` it evaluates to `undefined` and logs
`ExperimentalWarning: localStorage is not available because
--localstorage-file was not provided`. In the client project that global hides
jsdom's `localStorage`, so every test that touches storage sees `undefined`.

Verified: `NODE_OPTIONS=--no-experimental-webstorage npx vitest run
tests/pageData.test.ts` passes 46 of 46. Without the flag it is 35 of 46.

CI runs through `oven-sh/setup-bun` and does not pin Node, so it can be green
while a developer on Node 26 is red.

## Options considered

1. **Client-project setup file (chosen).** Restore jsdom's storage when the
   global is unusable. Works on every Node version and is a no-op where
   nothing is wrong.
2. **Pass `--no-experimental-webstorage` to the workers.** Older Node rejects
   the flag, so it needs a version check.
3. **Pin Node to 22.** Doesn't help a machine already on 26, and stops working
   once CI moves forward.

## Design

- `tests/setup/jsdomStorage.ts`, listed in the client project's `setupFiles`
  in `vite.config.ts`. The server project doesn't load it; it has no jsdom.
- For `localStorage` and `sessionStorage`: if the global's `clear` isn't a
  function, redefine the global as `jsdom.window[name]`, the instance Vitest's
  jsdom environment exposes.
- The filename is neither `*.test.ts` nor `*.spec.ts`, so neither project
  collects it as a test.

## Verification

- The eleven `rails`/`present` tests pass on Node 26 without any flag.
- The full unit suite keeps its pass count.

## Out of scope

Pinning a Node version in CI. Worth doing so CI matches developer machines,
but this fix doesn't depend on it.
