# Retire Template Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove five unused TanStarter pages from the route bundle while returning an HTTP 301 from each former URL to the site root.

**Architecture:** A pure redirect helper owns the exact retired-path allowlist. The Worker entry calls it before TanStack/locale handling, while the five file routes and their path constants are removed so their page modules are no longer bundled.

**Tech Stack:** TypeScript, TanStack Start file routes, Cloudflare Workers, Node test runner, Vite.

---

### Task 1: Specify retired-route behavior

**Files:**
- Create: `src/lib/retired-template-route.test.ts`
- Create: `src/lib/retired-template-route.ts`

- [ ] **Step 1: Write the failing redirect tests**

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getRetiredTemplateRedirect } from './retired-template-route';

const retiredPaths = ['/about', '/ai', '/contact', '/roadmap', '/waitlist'];

describe('getRetiredTemplateRedirect', () => {
  it('redirects every retired exact path to the same-origin root', () => {
    for (const path of retiredPaths) {
      assert.equal(
        getRetiredTemplateRedirect(`https://example.com${path}`),
        'https://example.com/'
      );
    }
  });

  it('drops query strings from retired paths', () => {
    assert.equal(
      getRetiredTemplateRedirect('https://example.com/about?ref=old'),
      'https://example.com/'
    );
  });

  it('does not redirect unrelated or similarly prefixed paths', () => {
    assert.equal(getRetiredTemplateRedirect('https://example.com/'), null);
    assert.equal(
      getRetiredTemplateRedirect('https://example.com/about/team'),
      null
    );
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm.cmd exec tsx --test src/lib/retired-template-route.test.ts`

Expected: FAIL because `retired-template-route.ts` does not exist.

- [ ] **Step 3: Implement the minimal helper**

```ts
const RETIRED_TEMPLATE_PATHS = new Set([
  '/about',
  '/ai',
  '/contact',
  '/roadmap',
  '/waitlist',
]);

export function getRetiredTemplateRedirect(requestUrl: string) {
  const url = new URL(requestUrl);
  if (!RETIRED_TEMPLATE_PATHS.has(url.pathname)) return null;
  return new URL('/', url).toString();
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `pnpm.cmd exec tsx --test src/lib/retired-template-route.test.ts`

Expected: 3 tests pass.

### Task 2: Retire page routes and wire Worker redirects

**Files:**
- Modify: `src/lib/retired-template-route.test.ts`
- Modify: `src/server.ts`
- Modify: `src/lib/routes.ts`
- Modify: `src/lib/locale.ts`
- Delete: `src/routes/(pages)/about.tsx`
- Delete: `src/routes/(pages)/ai.tsx`
- Delete: `src/routes/(pages)/contact.tsx`
- Delete: `src/routes/(pages)/roadmap.tsx`
- Delete: `src/routes/(pages)/waitlist.tsx`
- Generated: `src/routeTree.gen.ts`

- [ ] **Step 1: Add a failing route-removal test**

Add these imports and test:

```ts
import { existsSync, readFileSync } from 'node:fs';

const retiredRouteFiles = retiredPaths.map(
  (path) => `src/routes/(pages)/${path.slice(1)}.tsx`
);

it('removes retired pages from the file routes and generated route tree', () => {
  for (const file of retiredRouteFiles) {
    assert.equal(existsSync(file), false, `${file} should be removed`);
  }

  const routeTree = readFileSync('src/routeTree.gen.ts', 'utf8');
  for (const path of retiredPaths) {
    assert.equal(
      routeTree.includes(`'${path}'`),
      false,
      `${path} should be absent from the route tree`
    );
  }
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm.cmd exec tsx --test src/lib/retired-template-route.test.ts`

Expected: FAIL because the route files and generated entries still exist.

- [ ] **Step 3: Wire the helper into the Worker**

Import `getRetiredTemplateRedirect` in `src/server.ts`, evaluate it before the
legacy locale redirect, and return `Response.redirect(target, 301)` on match.

- [ ] **Step 4: Remove the five route files and stale path constants**

Delete the five files, remove `About`, `Ai`, `Contact`, `Roadmap`, and
`Waitlist` from `Routes`, and remove the five path strings from the locale
public-path allowlist.

- [ ] **Step 5: Regenerate the route tree and verify GREEN**

Run: `pnpm.cmd build`

Then run: `pnpm.cmd exec tsx --test src/lib/retired-template-route.test.ts`

Expected: production build succeeds and all redirect/route-removal tests pass.

### Task 3: Full verification and commit

**Files:**
- Verify all files changed above.

- [ ] **Step 1: Run repository checks**

Run the complete TypeScript test set, `pnpm.cmd check`, and
`pnpm.cmd locale:check`.

Expected: 0 failed tests and both checks exit 0.

- [ ] **Step 2: Run HTTP smoke checks on a fresh dev server**

Verify all five retired paths return HTTP 301 with the root as `Location`, a
similarly prefixed path returns 404, and raw HTML for `/` and `/challenge`
still contains parseable `WebSite`/`FAQPage` JSON-LD.

- [ ] **Step 3: Inspect the final diff**

Run: `git diff --check`, `git status --short`, and search tracked files for the
D1 UUID to confirm it remains absent.

- [ ] **Step 4: Commit the phase**

```bash
git add docs/superpowers/plans/2026-07-22-retire-template-routes.md src
git commit -m "fix: retire unused template routes"
```
