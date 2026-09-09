import { describe, expect, it } from "vitest";
import { createPlan, getTodayQueue, scheduleReviews, type SchedulerDeps } from "../../src/domain/scheduler";
import { createEmptyProfile } from "../../src/domain/profile";

const deps: SchedulerDeps = {
  clock: { now: () => "2026-12-31T08:00:00.000Z" },
  ids: { next: (prefix) => `${prefix}-id` },
};

describe("spaced review scheduler", () => {
  it("schedules reviews across a year boundary from the completed task date", () => {
    const profile = createEmptyProfile("student", "Asia/Shanghai", "2026-12-31T08:00:00.000Z");
    const reviews = scheduleReviews({ id: "learn-id", listId: "L01", dueDate: "2026-12-31", kind: "learn", estimatedMinutes: 8 }, profile, deps.clock, deps.ids);

    expect(reviews.map((task) => task.dueDate)).toEqual(["2027-01-01", "2027-01-02", "2027-01-04", "2027-01-07"]);
  });

  it("does not regenerate reviews already created for the same completed task", () => {
    const profile = createEmptyProfile("student", "Asia/Shanghai", "2026-12-31T08:00:00.000Z");
    profile.tasks = [{ id: "learn-id:review:1", listId: "L01", dueDate: "2027-01-01", kind: "review", estimatedMinutes: 8, sourceTaskId: "learn-id" }];

    expect(scheduleReviews({ id: "learn-id", listId: "L01", dueDate: "2026-12-31", kind: "learn", estimatedMinutes: 8 }, profile, deps.clock, deps.ids)).toEqual([]);
  });

  it("puts due reviews ahead of new work and respects the daily minute limit", () => {
    const profile = createEmptyProfile("student", "Asia/Shanghai", "2026-09-09T08:00:00.000Z");
    profile.tasks = [
      { id: "new", listId: "L02", dueDate: "2026-09-09", kind: "learn", estimatedMinutes: 8 },
      { id: "overdue", listId: "L01", dueDate: "2026-09-07", kind: "review", estimatedMinutes: 8 },
      { id: "due", listId: "L03", dueDate: "2026-09-09", kind: "review", estimatedMinutes: 8 },
    ];

    expect(getTodayQueue(profile, "2026-09-09", 16).map((task) => task.id)).toEqual(["overdue", "due"]);
  });

  it("creates one plan with learning tasks after validating the daily limit", () => {
    const profile = createEmptyProfile("student", "Asia/Shanghai", "2026-09-09T08:00:00.000Z");
    const result = createPlan({ name: "September", listIds: ["L01", "L02"], startDate: "2026-09-09", dailyWordTarget: 8, dailyMinuteLimit: 15 }, profile, deps);

    expect(result.plans).toHaveLength(1);
    expect(result.tasks.map((task) => task.listId)).toEqual(["L01", "L02"]);
  });
});
