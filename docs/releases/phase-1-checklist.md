# Phase 1 release checklist

Deployment must identify the exact `main` commit SHA and pass the complete automated suite before Pages publishing.

## Student

- A first-open real profile is empty and stays empty after refresh.
- A learner can create a 5–30 minute plan, study a small unit, make a recall judgement, and see saved evidence.
- Reviewing an old task never silently changes its original due date.

## Teacher

- The teacher view derives task, meaning, spelling, and overdue facts from saved attempts.
- Empty evidence is described as empty; it is never shown as a 100% rate.

## Parent

- The parent view shows the same evidence as the student and teacher views, a local-device notice, and one neutral next action.
- Demo data is visibly marked and cannot overwrite real progress.

## Product

- One report surface has one audience switch and one list scope selector.
- No UI claim says that a prototype-only flow is a complete learning loop.

## Engineering

- `npm test`, `npm run typecheck`, and `npm run build` pass.
- 26 lists and 416 stable word IDs remain available; List 1 and List 8 differ.
- Real and demo storage keys remain isolated; corrupt data produces a recoverable warning.

## QA

- At 320×568, 390×844, and desktop widths, primary controls remain reachable.
- Refresh preserves real plan and attempt evidence.
- Pages serves the tested `dist` artifact for the recorded commit SHA.
