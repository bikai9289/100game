# Share and Community Discoverability Design

## Goal

Make the existing sharing and commenting features obvious without changing
their data flow, security controls, or backend APIs.

## Selected Design

- Replace the sticky toolbar's icon-only share control with an icon-and-text
  `Share` button that remains visible before, during, and after a round.
- Keep the existing Web Share API behavior and clipboard fallback unchanged.
- Rename `Player notes` to `Community Wall`.
- Move the complete community wall before the 100 answer-slot grid in document
  order. Do not duplicate the wall or add a second summary component.
- Preserve the comment form, Turnstile widget, status messages, score labels,
  comment list, and community API calls unchanged.

## Responsive Behavior

The toolbar keeps its stable four-column layout. The share column grows to fit
the short text label, while the score and restart controls retain their current
behavior. The community wall remains a single column on small screens and the
existing two-column form/list layout on large screens.

## Error Handling

Sharing continues to report clipboard success and unsupported-browser errors
through the existing live status message. Comment loading and submission error
handling are unchanged.

## Verification

- A source test asserts that the persistent toolbar renders visible `Share`
  text.
- A source test asserts that `Community Wall` appears before `answerSlots.map`
  and that the old `Player notes` heading is gone.
- Run the focused Node test, the full Node test suite, Biome check, and the
  production build.
- Inspect desktop and mobile rendering through the running development server.

## Scope Exclusions

Email, leaderboard pagination, comment ranking pools, database changes, and
deployment are not part of this change.
