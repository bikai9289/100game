# Share and Community Discoverability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make sharing and the community wall immediately discoverable while preserving their existing behavior and backend integration.

**Architecture:** Keep all behavior inside the existing `Name100Game` component. Add source-level regression assertions for the visible label and document order, then make the smallest JSX-only change needed to satisfy them.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Node.js test runner, Biome

---

### Task 1: Share and Community Visibility

**Files:**
- Modify: `src/tests/homepage-game.test.ts`
- Modify: `src/components/game/name100-game.tsx`

- [x] **Step 1: Write the failing source test**

Add a test that reads `name100-game.tsx`, isolates the returned JSX, and asserts:

```ts
it('keeps sharing visible and places the community wall before answers', () => {
  const game = readFileSync('src/components/game/name100-game.tsx', 'utf8');
  const renderedGame = game.slice(game.indexOf('return ('));
  const communityIndex = renderedGame.indexOf('Community Wall');
  const answersIndex = renderedGame.indexOf('answerSlots.map');

  assert.match(renderedGame, /<IconShare \/>\s*Share/);
  assert.doesNotMatch(renderedGame, /Player notes/);
  assert.ok(communityIndex >= 0);
  assert.ok(answersIndex > communityIndex);
});
```

- [x] **Step 2: Verify the test fails for the missing UI**

Run:

```powershell
node --test --import tsx src/tests/homepage-game.test.ts
```

Expected: the new test fails because the persistent share button has no visible
`Share` text and `Community Wall` is not present.

- [x] **Step 3: Implement the minimal JSX change**

In `name100-game.tsx`:

```tsx
<Button
  type="button"
  variant="outline"
  onClick={() => void shareGame()}
  aria-label="Share challenge"
  title="Share challenge"
>
  <IconShare />
  Share
</Button>
```

Use a two-column toolbar below 360px so time/score and restart/share occupy two
stable rows. At 360px and wider, switch to four content-sized columns. Keep the
score on one line. Move the existing community `<section>` block to immediately
before the `answerSlots.map` container and change only its heading to
`Community Wall`.

- [x] **Step 4: Verify the focused test passes**

Run:

```powershell
node --test --import tsx src/tests/homepage-game.test.ts
```

Expected: all tests in `homepage-game.test.ts` pass.

- [x] **Step 5: Verify quality and production compilation**

Run:

```powershell
$testFiles = (Get-ChildItem -LiteralPath 'src' -Recurse -Filter '*.test.ts').FullName; node --test --import tsx $testFiles
pnpm check
pnpm build
```

Expected: all Node tests pass, Biome reports no errors, and Vite completes the
production build.

- [x] **Step 6: Review the final diff**

Run:

```powershell
git diff --check
git diff -- src/tests/homepage-game.test.ts src/components/game/name100-game.tsx
```

Expected: no whitespace errors and no changes outside the approved UI scope.
