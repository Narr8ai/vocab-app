import { describe, expect, it } from "vitest";
import { submitAttempt } from "../../src/domain/learning";
import { createEmptyProfile } from "../../src/domain/profile";
import { createPlan, getTodayQueue, scheduleReviews, type SchedulerDeps } from "../../src/domain/scheduler";

const deps: SchedulerDeps = {
  clock: { now: () => "2026-09-09T08:00:00.000Z" },
  ids: { next: (prefix) => `${prefix}-id` },
};

describe("core learning journey", () => {
  it("creates a selected-list task, records both assessments, and presents spaced reviews", () => {
    const empty = createEmptyProfile("student", "Asia/Shanghai", "2026-09-09T08:00:00.000Z");
    const planned = createPlan({ name: "My plan", listIds: ["L02"], startDate: "2026-09-09", dailyWordTarget: 8, dailyMinuteLimit: 15 }, empty, deps);
    const task = getTodayQueue(planned, "2026-09-09", 15)[0];
    expect(task.listId).toBe("L02");

    const meaning = submitAttempt({ attemptId: "meaning-1", taskId: task.id, listId: task.listId, kind: "meaning", reviewOccurrenceId: task.id, occurredAt: "2026-09-09T08:10:00.000Z", results: [{ wordId: "L02-accent", correct: true }] }, planned);
    const assessed = submitAttempt({ attemptId: "spelling-1", taskId: task.id, listId: task.listId, kind: "spelling", reviewOccurrenceId: task.id, occurredAt: "2026-09-09T08:11:00.000Z", results: [{ wordId: "L02-accent", correct: true }] }, meaning);
    const completedTask = { ...task, completedAt: "2026-09-09T08:11:00.000Z" };
    const withReviews = { ...assessed, tasks: [{ ...completedTask }, ...scheduleReviews(completedTask, assessed, deps.clock, deps.ids)] };

    expect(withReviews.attempts.map((attempt) => attempt.kind)).toEqual(["meaning", "spelling"]);
    expect(getTodayQueue(withReviews, "2026-09-09", 15)).toEqual([]);
    expect(getTodayQueue(withReviews, "2026-09-10", 15).map((review) => review.dueDate)).toEqual(["2026-09-10"]);
  });
});
