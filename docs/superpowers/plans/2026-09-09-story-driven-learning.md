# Story-Driven Vocabulary Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every vocabulary task begin with an original interactive story and a plot-based recall round before the existing meaning and spelling assessments.

**Architecture:** Store all story content as typed structured segments under `src/data/story-units/`, validate it through pure domain helpers in `src/domain/story-learning.ts`, and render it with DOM APIs in a focused `src/ui/story-view.ts`. Keep the persisted `study` step and schema version unchanged so existing profiles resume safely, then connect the story word IDs to the existing assessment pipeline.

**Tech Stack:** TypeScript 5.6, browser DOM and Web Speech API, Vite 6, Vitest 2

**Spec:** `docs/superpowers/specs/2026-09-09-story-driven-learning-design.md`

## Global Constraints

- Learning order is story reading, plot recall, meaning test, then spelling test.
- Every one of the 26 Lists has one original story with exactly 6 words from that List.
- Do not copy text, characters, titles, or images from the reference PDF.
- Keep `SCHEMA_VERSION = 1` and persist story reading as `step: "study"`.
- Render story text with DOM APIs; do not use `innerHTML`.
- Do not redesign the home, plan, or report information architecture.
- Do not add story data to parent or teacher reports.
- All interactive controls must work at 360px width and have a minimum 44px touch target.

---

### Task 1: Story domain contract and validation

**Files:**
- Create: `src/domain/story-learning.ts`
- Create: `tests/unit/story-learning.test.ts`

**Interfaces:**
- Consumes: `ListId`, `getList` and `VocabWord` from `src/data/vocab.ts`.
- Produces: `StorySegment`, `StoryParagraph`, `StoryRecallPrompt`, `StoryUnit`, `getStoryWordIds(unit)`, `validateStoryUnit(unit)`, and `storyRecallChoices(unit, wordId)`.

- [ ] **Step 1: Write failing tests for story integrity and recall choices**

```ts
const valid: StoryUnit = {
  listId: "L01",
  title: "测试故事",
  hook: "一项任务突然改变。",
  paragraphs: [{ id: "p1", segments: [{ type: "text", text: "他决定" }, { type: "word", wordId: "L01-abandon" }] }],
  usageNotes: { "L01-abandon": "abandon the plan：放弃计划" },
  recallPrompts: [{ wordId: "L01-abandon", cue: "他决定____原计划。" }],
};

expect(validateStoryUnit(valid)).toEqual([]);
expect(getStoryWordIds(valid)).toEqual(["L01-abandon"]);
expect(storyRecallChoices(valid, "L01-abandon")).toContain("L01-abandon");
```

Add separate cases proving validation rejects an unknown word ID, a word missing from the paragraphs, a duplicate recall prompt, and a missing usage note. The production mutation each test catches is the corresponding validation branch being removed.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/unit/story-learning.test.ts`

Expected: FAIL because `src/domain/story-learning.ts` does not exist.

- [ ] **Step 3: Implement the types and pure helpers**

`validateStoryUnit` returns human-readable string errors and verifies list membership plus one-to-one paragraph/usage/recall coverage. `storyRecallChoices` returns up to three distinct word IDs from the same unit, always including the answer, in deterministic order so tests and resumed screens remain stable.

- [ ] **Step 4: Run the focused tests and full unit suite**

Run: `npm test -- tests/unit/story-learning.test.ts && npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/story-learning.ts tests/unit/story-learning.test.ts
git commit -m "feat: define story learning contract"
```

### Task 2: Original story content for all Lists

**Files:**
- Create: `src/data/story-units/L01-L09.ts`
- Create: `src/data/story-units/L10-L18.ts`
- Create: `src/data/story-units/L19-L26.ts`
- Create: `src/data/stories.ts`
- Create: `tests/unit/stories.test.ts`

**Interfaces:**
- Consumes: `StoryUnit` and `validateStoryUnit` from Task 1.
- Produces: `STORY_UNITS: readonly StoryUnit[]` and `getStoryUnit(listId: ListId): StoryUnit`.

- [ ] **Step 1: Write the failing catalog tests**

```ts
expect(STORY_UNITS).toHaveLength(26);
expect(STORY_UNITS.map((unit) => unit.listId)).toEqual(
  Array.from({ length: 26 }, (_, index) => `L${String(index + 1).padStart(2, "0")}`),
);
for (const unit of STORY_UNITS) {
  expect(getStoryWordIds(unit)).toHaveLength(6);
  expect(validateStoryUnit(unit)).toEqual([]);
  expect(unit.paragraphs).toHaveLength(3);
}
expect(getStoryUnit("L08").listId).toBe("L08");
```

The test catches a missing List, duplicated catalog entry, invalid target word, missing story occurrence, missing usage note, missing recall cue, or a story with the wrong number of paragraphs or words.

- [ ] **Step 2: Run the catalog test and verify RED**

Run: `npm test -- tests/unit/stories.test.ts`

Expected: FAIL because the story catalog does not exist.

- [ ] **Step 3: Write 26 original story units**

Each unit has exactly 6 target words, 3 concise Chinese narrative paragraphs, a concrete problem and resolution, one usage note per word, and one plot cue per word. Split the content into the three range files above, export combined `STORY_UNITS` from `src/data/stories.ts`, and throw `Unknown story unit: <id>` for an invalid lookup.

- [ ] **Step 4: Run content integrity and vocabulary tests**

Run: `npm test -- tests/unit/stories.test.ts tests/unit/vocab.test.ts`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/story-units src/data/stories.ts tests/unit/stories.test.ts
git commit -m "feat: add original stories for every list"
```

### Task 3: Interactive story reader

**Files:**
- Create: `src/ui/story-view.ts`
- Create: `tests/unit/story-view.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `StoryUnit`, `getStoryWordIds`, and vocabulary words resolved by the caller.
- Produces: `renderStoryView(options: { unit: StoryUnit; words: readonly VocabWord[]; estimatedMinutes: number; onContinue: (wordIds: string[]) => void; speak?: (text: string) => void }): HTMLElement`.

- [ ] **Step 1: Add the DOM test environment and write failing behavior tests**

Run `npm install --save-dev happy-dom@20.14.0`. Add `// @vitest-environment happy-dom` to `tests/unit/story-view.test.ts`, use a real document fixture, and assert the returned element exposes the story title, three paragraph containers, six target-word buttons, a hidden detail panel, and a continue button. Clicking `abandon` must set its button to `aria-expanded="true"`, reveal the exact vocabulary meaning and usage note, and clicking “播放发音” must call the supplied `speak` callback with `abandon`. Clicking continue must call `onContinue` with the unit’s six word IDs in story order.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/unit/story-view.test.ts`

Expected: FAIL because `renderStoryView` does not exist.

- [ ] **Step 3: Implement the story reader with DOM creation**

Build every text and word node with `document.createElement` and `textContent`. Keep one detail panel inside the card, close the previously selected word, and pass the selected spelling to the injected speech callback. Add `.story-card`, `.story-progress`, `.story-paragraph`, `.story-word`, `.story-word-detail`, and focus-visible styles; use a single-column 360px layout and a 760px desktop maximum.

- [ ] **Step 4: Run the focused test, typecheck, and tests**

Run: `npm test -- tests/unit/story-view.test.ts && npm run typecheck && npm test`

Expected: all checks PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/ui/story-view.ts src/styles.css tests/unit/story-view.test.ts
git commit -m "feat: add interactive story reader"
```

### Task 4: Plot recall and learning-flow integration

**Files:**
- Create: `src/ui/story-recall-view.ts`
- Create: `tests/unit/story-recall-view.test.ts`
- Modify: `src/ui/app.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `getStoryUnit`, `getStoryWordIds`, `storyRecallChoices`, `renderStoryView`, existing `checkpoint`, `showMeaningQuiz`, and `showSpelling` behavior.
- Produces: `renderStoryRecall(options: { unit: StoryUnit; resolveSpelling: (wordId: string) => string; onComplete: (wordIds: string[]) => void }): HTMLElement`; `showStudy` renders the story reader and `showRecall` renders plot recall.

- [ ] **Step 1: Write failing plot-recall DOM tests**

Assert that question 1 shows the literal story cue, offers three English words, does not expose question 2 before an answer, marks a wrong choice and displays the correct spelling, then advances only after “下一题”. After question 6, the final button must call `onComplete` with the same six story word IDs.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/unit/story-recall-view.test.ts`

Expected: FAIL because the plot recall view does not exist.

- [ ] **Step 3: Implement plot recall and connect the application flow**

Replace the word-list body in `showStudy` with `renderStoryView`. Use `window.speechSynthesis.speak(new SpeechSynthesisUtterance(spelling))` when available. Replace self-rated recall rows with `renderStoryRecall`; its completion calls `showMeaningQuiz`. Keep all checkpoint step names and resume branches unchanged, and always derive the six IDs from the matching `StoryUnit`.

- [ ] **Step 4: Run focused tests and the full suite**

Run: `npm test -- tests/unit/story-recall-view.test.ts tests/unit/story-view.test.ts && npm run typecheck && npm test`

Expected: all checks PASS, including existing active-learning resume tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/story-recall-view.ts src/ui/app.ts src/styles.css tests/unit/story-recall-view.test.ts
git commit -m "feat: connect stories to the learning flow"
```

### Task 5: Clean application entry and production QA

**Files:**
- Modify: `index.html`
- Modify: `tests/unit/smoke.test.ts`
- Create: `docs/qa/2026-09-09-story-learning-qa.md`

**Interfaces:**
- Consumes: application bootstrap from `src/ui/app.ts` and the complete learning flow from Tasks 1–4.
- Produces: one accessible page root with no hidden duplicate prototype, a production build, and an evidence-backed QA report.

- [ ] **Step 1: Write the failing entry-page smoke test**

Read `index.html` in the test and parse the structural contract: exactly one `id="real-learning-root"`, exactly one module script for `/src/ui/app.ts`, a Chinese page title, and no legacy `screen-study`, `goHome()`, or hard-coded prototype story markers. This test catches reintroducing the duplicate application shell that currently remains available to assistive technology.

- [ ] **Step 2: Run the smoke test and verify RED**

Run: `npm test -- tests/unit/smoke.test.ts`

Expected: FAIL because the legacy prototype is still present.

- [ ] **Step 3: Replace the entry document with the minimal application shell**

Keep the existing Vite module entry, viewport metadata, Chinese language, and `real-learning-root` accessible label. Remove the old inline styles, scripts, duplicate screens, hard-coded reports, and prototype story.

- [ ] **Step 4: Verify code, build, and browser experience**

Run: `npm run typecheck && npm test && npm run build`

Then test the production page at 360×800 and 1280×800: create or load a plan, read a story, open two word details, finish all six plot recall questions, complete meaning and spelling, refresh at each saved step, and confirm student/parent/teacher reports still show the same assessment evidence. Record pass/fail evidence and any fixed issue in `docs/qa/2026-09-09-story-learning-qa.md`.

- [ ] **Step 5: Commit**

```bash
git add index.html tests/unit/smoke.test.ts docs/qa/2026-09-09-story-learning-qa.md
git commit -m "test: verify story learning experience"
```

### Task 6: Final review and GitHub Pages release

**Files:**
- Modify if needed: files named by final review findings
- Modify: `docs/qa/2026-09-09-story-learning-qa.md`

**Interfaces:**
- Consumes: the complete branch diff and all validation commands.
- Produces: reviewed release commit on `main` and a verified public GitHub Pages URL.

- [ ] **Step 1: Run product, teaching, student, parent, engineering, and QA review**

Review the full diff against every acceptance criterion in the spec. Block release for invalid story vocabulary, confusing plot cues, a broken resume step, inaccessible word controls, fabricated report evidence, horizontal scrolling, or any failing automated check.

- [ ] **Step 2: Fix confirmed findings with a failing regression test first**

For each code defect, add a focused test that fails for the observed behavior, run it to verify RED, make the smallest fix, and rerun it to verify GREEN. Editorial story fixes must pass `tests/unit/stories.test.ts`.

- [ ] **Step 3: Run final verification**

Run: `npm run typecheck && npm test && npm run build && git status --short`

Expected: typecheck PASS, all tests PASS, build PASS, and only intended tracked QA documentation changes remain.

- [ ] **Step 4: Push and verify deployment**

Push the reviewed branch state to `origin/main`. Open `https://narr8ai.github.io/vocab-app/?v=<short-commit>` and verify the deployed `version.json` commit matches the pushed commit plus the story reader loads successfully.

- [ ] **Step 5: Record release evidence**

Append the commit, deployed URL, automated check counts, tested viewports, and remaining content limitations to `docs/qa/2026-09-09-story-learning-qa.md`, then commit and push that record.
