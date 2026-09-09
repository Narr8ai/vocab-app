# Task 4 report: Plot recall and core-flow integration

## RED evidence

`npm test -- tests/unit/story-recall-view.test.ts` failed before implementation.
Vitest could not resolve `../../src/ui/story-recall-view`, because the recall
view module did not exist. The new happy-dom test exercised a real `L01`
`StoryUnit` and named the consumer-visible breaks: missing cue/progress,
unchanged answer order, advancing before acknowledgement, missing feedback,
and a missing completion callback.

## GREEN evidence

After the minimal DOM view and flow connection were added:

- `npm test -- tests/unit/story-recall-view.test.ts tests/unit/story-view.test.ts` — 7 tests passed.
- `npm run typecheck` — passed.
- `npm test` — 19 files and 57 tests passed.
- `npm run build` — passed.

## Changes

- Added `renderStoryRecall`, with deterministic per-question rotation of the
  three choices, disabled choices after selection, immediate feedback, and
  one-step continuation.
- Replaced the study word-list screen with the committed story reader,
  persisted the story word IDs, and provided browser speech only when the Web
  Speech interfaces are available.
- Replaced self-ratings with plot recall, then continued into the unchanged
  meaning and spelling pipeline. Resume routes keep `study` and `recall` on
  their corresponding story-based screens.
- Added focused recall styles with 44px options/actions and wrapping at narrow
  widths.

## Self-review

The recall view uses `document.createElement` and `textContent` for every
student-visible value. The test confirms the exact first cue, a wrong-answer
lockout, correct-answer feedback, one-question progression, varied correct
choice positions, and the final original six IDs. Story and recall screens
derive their word sequence from the same `StoryUnit`; existing assessment,
report, schema, and checkpoint step names remain unchanged.

## Commit

`5f353d1` — `feat: connect stories to the learning flow`.

## Review fix round 1

### RED evidence

After adding the regression assertions, `npm test --
tests/unit/story-recall-view.test.ts` failed in two expected ways: the feedback
element had no `role="status"`, and recall completion returned the current
catalog IDs instead of a supplied saved set.

### GREEN evidence

- `npm test -- tests/unit/story-recall-view.test.ts tests/unit/story-view.test.ts` — 8 tests passed.
- `npm run typecheck` — passed.
- `npm test` — 19 files and 59 tests passed.
- `npm run build` — passed.

### Review fixes

- `showRecall` now takes word IDs from its caller, checkpoints those exact IDs,
  and passes them to the recall view. The resume branch passes
  `active.wordIds`; the continuation into meaning uses the same saved IDs.
- `renderStoryRecall` has an optional `wordIds` seam for the persisted group.
  A happy-dom integration test loads a recall checkpoint whose IDs differ from
  the story catalog, completes plot recall, and verifies both the meaning
  prompt and checkpoint still use the saved group.
- Recall feedback now has `role="status"` and a DOM assertion covers it.
