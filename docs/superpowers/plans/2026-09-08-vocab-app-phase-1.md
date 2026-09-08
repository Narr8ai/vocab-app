# Vocab App Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前 GitHub Pages 演示稿改造成单设备、无需登录、数据真实且可验证的词汇学习 MVP。

**Architecture:** 使用 TypeScript、Vite 和原生 DOM，将领域规则、应用命令、本地存储、内容数据和页面渲染分离。所有报告从不可变答题记录和任务记录计算；浏览器本地档案是第一阶段唯一事实源，未来通过仓储接口替换为云端。

**Tech Stack:** TypeScript 5、Vite 7、Vitest、Playwright、原生 HTML/CSS、GitHub Actions/Pages。

**Spec:** `docs/superpowers/specs/2026-09-08-vocab-app-phase-1-design.md`

## Global Constraints

- 第一阶段不实现登录、云同步、真实家庭/师生绑定、支付、推送或完整 3500 词。
- 首次打开必须为空白；演示档案与真实档案使用不同存储键且不能互相覆盖。
- 词义与拼写分开记录；List 最近一次适用测试均达到 80% 才算本轮完成。
- 错词仅在 3 个不同复习任务中连续正确后移出当前错题队列。
- Day+1、Day+2、Day+4、Day+7 从初学完成日期计算；到期复习优先于新学。
- 所有报告指标必须能从任务、答题和学习会话事实重算；无数据时显示空状态。
- 每阶段经过产品、学生、老师、家长、开发、测试六角色评审后才可发布。

---

## File Map

- `index.html`: 页面语义骨架和应用入口。
- `src/styles.css`: 响应式样式和模式/错误提示。
- `src/domain/types.ts`: 稳定 ID、档案和领域实体类型。
- `src/domain/profile.ts`: 空档案、状态转换和完成判定。
- `src/domain/scheduler.ts`: 计划、任务和复习日期。
- `src/domain/reports.ts`: 学生、家长和老师视图模型。
- `src/application/app-service.ts`: 一次用户动作对应一次原子档案更新。
- `src/infrastructure/profile-repository.ts`: 仓储契约。
- `src/infrastructure/local-storage-repository.ts`: 版本化存储、迁移和恢复。
- `src/data/vocab.ts`: 26 个演示 List 及稳定 `wordId`。
- `src/ui/app.ts`: 导航、事件绑定和页面渲染。
- `tests/unit/*.test.ts`: 领域与存储测试。
- `tests/e2e/core-flow.spec.ts`: 关键浏览器旅程。
- `.github/workflows/deploy.yml`: 测试、构建、Pages 发布。

---

### Task 1: Preserve Online Baseline and Unify Source Branch

**Files:**
- Modify: `index.html`
- Modify: `README.md`
- Preserve: `.github/workflows/deploy.yml`
- Create: `docs/releases/phase-0-baseline.md`

**Interfaces:**
- Consumes: `origin/gh-pages@1397eae` online UI and `main` Pages workflow.
- Produces: one auditable `main`-based baseline and rollback reference.

- [ ] **Step 1: Record the immutable baseline**

Create tag `pre-main-migration-2026-09-08` at `1397eae`. In the release note record the tag, current live URL, source branches, and rollback command `git revert <migration-commit>`.

- [ ] **Step 2: Add a baseline smoke check**

Create a temporary static check that asserts the migrated `index.html` contains `renderStudentView`, `renderParentView`, `renderTeacherView`, and the 26-List vocabulary object. Run it against current `main`; expected result is failure.

- [ ] **Step 3: Migrate the live assets**

Restore `index.html` from `origin/gh-pages`; compare `README.md` and `flowchart.html` individually. Keep `.github/workflows/deploy.yml` from `main`. Update README to describe the site as a prototype with incomplete persistence rather than “100% closed loop.”

- [ ] **Step 4: Verify and commit**

Run the static check, open the site locally, and verify the four tabs, 26 Lists, and three report views render without console errors.

```bash
git add index.html README.md flowchart.html docs/releases/phase-0-baseline.md
git commit -m "chore: move live prototype onto main baseline"
```

---

### Task 2: Establish Build, Test, and Module Boundaries

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/domain/types.ts`
- Create: `src/styles.css`
- Create: `src/ui/app.ts`
- Modify: `index.html`
- Create: `tests/unit/smoke.test.ts`

**Interfaces:**
- Produces: `npm run test`, `npm run typecheck`, `npm run build`; static output in `dist/` with Pages base `/vocab-app/`.

- [ ] **Step 1: Write the failing module smoke test**

```ts
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../../src/domain/types";

describe("application modules", () => {
  it("exposes schema version 1", () => expect(SCHEMA_VERSION).toBe(1));
});
```

- [ ] **Step 2: Configure the toolchain**

Add scripts `dev`, `test`, `test:e2e`, `typecheck`, and `build`. Configure Vite with `base: "/vocab-app/"`. Define `export const SCHEMA_VERSION = 1 as const` and load `src/ui/app.ts` from `index.html` as a module.

- [ ] **Step 3: Verify and commit**

Run `npm test`, `npm run typecheck`, and `npm run build`; all must pass and `dist/index.html` must reference assets under `/vocab-app/`.

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts src tests index.html
git commit -m "chore: add typed static app toolchain"
```

---

### Task 3: Versioned Real and Demo Profile Storage

**Files:**
- Modify: `src/domain/types.ts`
- Create: `src/domain/profile.ts`
- Create: `src/application/app-service.ts`
- Create: `src/infrastructure/profile-repository.ts`
- Create: `src/infrastructure/local-storage-repository.ts`
- Create: `tests/unit/profile.test.ts`
- Create: `tests/unit/local-storage-repository.test.ts`

**Interfaces:**
- Produces: `createEmptyProfile(profileId, timezone, now): LearningProfile`.
- Produces: `ProfileRepository.load(mode)`, `save(profile)`, `clearReal()`, `backupCorrupt(raw)`.
- Storage keys: `vocab-app:profile:real:v1`, `vocab-app:profile:demo:v1`, `vocab-app:profile:corrupt:<timestamp>`.

- [ ] **Step 1: Write failing profile tests**

Test that a missing key creates an empty real profile; a real profile survives save/load; loading demo leaves the serialized real profile byte-for-byte unchanged; invalid JSON returns an empty profile plus a recoverable warning; clearing real data does not clear demo data.

```ts
expect(repo.load("real").profile.attempts).toEqual([]);
expect(storage.getItem("vocab-app:profile:real:v1")).toBe(realBeforeDemo);
```

- [ ] **Step 2: Define stable entities**

Define `LearningProfile`, `StudyPlan`, `LearningTask`, `ListState`, `WordState`, `Attempt`, `StudySession`, and `DailyCompletion`. IDs are strings; calendar dates use `YYYY-MM-DD`; event times use ISO timestamps. Attempts are append-only.

- [ ] **Step 3: Implement validated atomic persistence**

Validate parsed shapes before use. Save to a temporary key, read it back, then replace the active key. On parse or schema failure, retain the raw value under a corrupt backup key and return a warning instead of throwing a page-blocking error.

- [ ] **Step 4: Verify and commit**

Run `npm test -- tests/unit/profile.test.ts tests/unit/local-storage-repository.test.ts` and `npm run typecheck`.

Commit: `feat: add versioned local learning profiles`.

---

### Task 4: Isolate All 26 Vocabulary Lists

**Files:**
- Create: `src/data/vocab.ts`
- Create: `tests/unit/vocab.test.ts`
- Modify: `src/ui/app.ts`

**Interfaces:**
- Produces: `getList(listId: ListId): VocabList`.
- Produces: `VocabList { id, title, words }`; each `Word { id, spelling, phonetic, meaning, defaultSpellingRequired }`.

- [ ] **Step 1: Write the failing mapping test**

Iterate Lists 1–26. Assert each exists, contains 16 prototype words, has unique `listId + wordId`, and List 1 and List 8 have different first and last words.

- [ ] **Step 2: Extract and normalize live vocabulary data**

Move the `origin/gh-pages` vocabulary object into typed data. Use stable IDs such as `L08-radiate`; do not use array indexes as persisted identifiers.

- [ ] **Step 3: Route every learning screen through selected `listId`**

Clicking a List updates one application selection state. Word index, recall, tests and spelling selection read `getList(selectedListId)`. Persist spelling requirements by `wordId`, never under `spellSet_list8`.

- [ ] **Step 4: Verify and commit**

Run the unit test and a browser script that opens all 26 Lists and checks their displayed first/last word.

Commit: `feat: isolate vocabulary and state for every list`.

---

### Task 5: Plans, Daily Load, and Spaced Review Tasks

**Files:**
- Create: `src/domain/scheduler.ts`
- Create: `tests/unit/scheduler.test.ts`
- Modify: `src/application/app-service.ts`

**Interfaces:**
- Produces: `createPlan(input, profile, deps): LearningProfile`.
- Produces: `scheduleReviews(completedTask, profile, clock): LearningTask[]`.
- Produces: `getTodayQueue(profile, date, minuteLimit): LearningTask[]` with due reviews before new work.

- [ ] **Step 1: Write failing schedule tests**

Cover month/year rollover, leap day, Day+1/+2/+4/+7 from initial completion, deterministic task IDs, no duplicate regeneration, due-review priority, and overdue rollover constrained by the daily minute limit.

```ts
expect(reviewTasks.map(t => t.dueDate)).toEqual([
  "2027-01-01", "2027-01-02", "2027-01-04", "2027-01-07"
]);
```

- [ ] **Step 2: Implement pure calendar scheduling**

Inject `Clock`, `IdGenerator`, and timezone. Never derive dates from List number or hard-coded September values. Keep the original due date on overdue tasks and select only the daily capacity into today’s queue.

- [ ] **Step 3: Persist plan creation in one command**

Validate non-empty List selection, start date, daily word target, and 5–30 minute daily limit. Generate plan/tasks, then save the complete profile once. Render validation errors as text.

- [ ] **Step 4: Verify and commit**

Run scheduler and storage tests, then refresh the browser after creating a plan and confirm the same queue returns.

Commit: `feat: schedule persistent daily learning and reviews`.

---

### Task 6: Learning State Machine and Attempt Evidence

**Files:**
- Create: `src/domain/learning.ts`
- Create: `tests/unit/learning.test.ts`
- Modify: `src/application/app-service.ts`

**Interfaces:**
- Produces: `completeRecall(taskId, ratings, profile): LearningProfile`.
- Produces: `submitAttempt(input, profile): LearningProfile`.
- Produces: `deriveListCompletion(listId, profile): ListCompletion`.
- `AttemptInput` includes unique `attemptId`, `taskId`, `listId`, `kind`, `reviewOccurrenceId`, and per-word results.

- [ ] **Step 1: Write failing state-machine tests**

Cover step order; recall requires a rating per word; duplicate `attemptId` is idempotent; 79% fails and 80% passes; no-spelling-word Lists omit spelling; browsing never creates mastery; List completion retains individual weak words.

- [ ] **Step 2: Write failing wrong-word tests**

An error resets the relevant meaning/spelling streak. Same-session correction does not advance it. Correct answers from three distinct review occurrence IDs advance 1→2→3 and remove the word from the active queue; an intervening error resets to zero.

- [ ] **Step 3: Implement immutable event updates**

Append one complete attempt per submission, then derive word/list state. Prevent double-click and history reload duplication through `attemptId`. Keep historical errors even after active recovery.

- [ ] **Step 4: Verify and commit**

Run `npm test -- tests/unit/learning.test.ts` and `npm run typecheck`.

Commit: `feat: record verifiable learning attempts and mastery`.

---

### Task 7: Student Daily Experience and Automatic Completion

**Files:**
- Modify: `index.html`
- Modify: `src/styles.css`
- Modify: `src/ui/app.ts`
- Modify: `src/application/app-service.ts`
- Create: `tests/e2e/core-flow.spec.ts`

**Interfaces:**
- Consumes: scheduler queue and learning commands.
- Produces: one “Continue today” route, resumable task UI, and automatic `DailyCompletion` only when all scheduled tasks are complete.

- [ ] **Step 1: Write the failing core E2E journey**

Test: fresh page is empty → create a plan → reload → enter first task → complete context and active recall → submit meaning/spelling attempts → reload → report and queue reflect completion. Add a negative test proving no manual completion control exists and skipped steps cannot create a daily completion.

- [ ] **Step 2: Implement the 10–15 minute flow**

Display estimated minutes and remaining words. Split new words into 5–8 word units. Recall shows the answer only after a “know/uncertain/don’t know” response. Give immediate test feedback and one same-session correction without advancing the cross-review streak.

- [ ] **Step 3: Add resumable progress and active time**

Persist the last incomplete step. Count time only while the document is visible and the user has interacted within the last 60 seconds; pause on `visibilitychange`, blur, and page close.

- [ ] **Step 4: Verify and commit**

Run unit tests plus `npm run test:e2e -- core-flow.spec.ts` at 390×844 and 1366×768.

Commit: `feat: deliver resumable evidence-based daily learning`.

---

### Task 8: One Report Surface, Three Trustworthy Views

**Files:**
- Create: `src/domain/reports.ts`
- Create: `tests/unit/reports.test.ts`
- Modify: `index.html`
- Modify: `src/ui/app.ts`

**Interfaces:**
- Produces: `buildReport(profile, { audience, listId?, period }): ReportViewModel`.
- `audience` is `student | parent | teacher`; `listId` omission means all Lists.

- [ ] **Step 1: Create golden profile fixtures and failing report tests**

Fixtures: empty, one-day, completed, overdue, no-spelling, declining scores, recovered wrong word. For each, hand-calculate attempt counts and rates. Assert all three audiences share the same base facts and filtering changes only the selected scope.

- [ ] **Step 2: Implement report selectors**

Student output: remaining task, estimated time, weakest active words. Parent output: weekly plan completion, on-time review rate, delayed retention trend, one neutral action. Teacher output: task evidence, meaning/spelling rates with sample sizes, overdue reviews and difficult Lists. No due reviews yields “no due reviews,” not 100%.

- [ ] **Step 3: Replace duplicate report navigation**

Keep one audience switch and one scope selector at the top. Remove the separate overview/detail audience switch. Show period, sample size, data timestamp, local-device notice, and persistent demo badge.

- [ ] **Step 4: Verify and commit**

Run the report tests across 3 audiences × 27 scopes. Manually trace one displayed number to its underlying attempt fixture.

Commit: `feat: derive three report views from shared evidence`.

---

### Task 9: Empty, Demo, Recovery, and Responsive States

**Files:**
- Create: `src/data/demo-profile.ts`
- Modify: `src/styles.css`
- Modify: `src/ui/app.ts`
- Modify: `tests/e2e/core-flow.spec.ts`

**Interfaces:**
- Produces: `loadDemoProfile()` and `exitDemoMode()` without modifying the real repository key.
- Produces: recoverable UI states for unavailable storage, corrupt data, empty reports and unsupported speech.

- [ ] **Step 1: Write failing isolation and recovery E2E tests**

Save real progress, load demo, navigate all views, exit demo, and compare the real profile snapshot. Inject invalid JSON and a throwing storage adapter; assert the page stays usable and explains whether data is temporary or recovered.

- [ ] **Step 2: Implement demo and safe reset**

Show a persistent demo badge on every screen. Reset real data only after a specific second confirmation stating that plans, tests, wrong words and reports will be removed. Never render plan names or imported strings with unsanitized `innerHTML`.

- [ ] **Step 3: Make the layout device-native**

Replace the fixed 375×667 frame with responsive `min-height: 100dvh` behavior on mobile and an optional centered preview shell on desktop. Ensure 320px width, landscape, soft keyboard and 200% text zoom keep navigation and submit controls reachable; interactive targets are at least 44px in the primary path.

- [ ] **Step 4: Verify and commit**

Run E2E at 320×568, 390×844, and desktop; manually check iPhone Safari and Android Chrome before release.

Commit: `feat: add safe demo mode and resilient mobile states`.

---

### Task 10: CI, Deployment, and Six-Role Release Gate

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Create: `docs/releases/phase-1-checklist.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: all tests and Vite build.
- Produces: tested `dist/` Pages artifact and a release checklist tied to the deployed commit SHA.

- [ ] **Step 1: Make CI fail before deployment on quality errors**

Configure the workflow to install locked dependencies, run typecheck, unit tests, Playwright smoke tests, and build. Upload only `dist/`. Include the commit SHA in a generated `dist/version.json`.

- [ ] **Step 2: Run complete verification**

```bash
npm ci
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Expected: all commands pass; no console errors, missing assets or cross-List mismatches.

- [ ] **Step 3: Conduct six-role review**

Product checks scope and metrics; student completes the daily flow; teacher traces task→attempt→word evidence; parent answers the four 30-second questions; developer reviews data and migration boundaries; tester verifies golden fixtures, responsive devices and online SHA.

- [ ] **Step 4: Publish and smoke-test the real URL**

After merge to `main`, wait for Pages deployment. Verify `/vocab-app/` and `/vocab-app/version.json` identify the same commit. Create a fresh-browser plan, reload it, and complete one short test without console errors.

- [ ] **Step 5: Commit release documentation**

Commit: `docs: record phase one release evidence`.

Phase 1 is complete only when Critical and High defects are zero and every acceptance criterion in the spec has evidence attached.
