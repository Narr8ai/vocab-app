import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "../../src/domain/profile";
import { recordDailyCompletion } from "../../src/domain/progress";

describe("daily completion evidence", () => {
  it("records a day only when all due tasks are completed", () => {
    const profile = createEmptyProfile("student", "Asia/Shanghai", "2026-09-09T08:00:00.000Z");
    profile.tasks = [{ id: "task-1", listId: "L01", dueDate: "2026-09-09", kind: "learn", estimatedMinutes: 5, completedAt: "2026-09-09T08:10:00.000Z" }];
    const once = recordDailyCompletion(profile, "2026-09-09", "2026-09-09T08:10:00.000Z");
    const twice = recordDailyCompletion(once, "2026-09-09", "2026-09-09T08:11:00.000Z");

    expect(twice.dailyCompletions).toEqual([{ date: "2026-09-09", taskIds: ["task-1"], completedAt: "2026-09-09T08:10:00.000Z" }]);
  });

  it("does not create a daily completion while another due task remains", () => {
    const profile = createEmptyProfile("student", "Asia/Shanghai", "2026-09-09T08:00:00.000Z");
    profile.tasks = [
      { id: "done", listId: "L01", dueDate: "2026-09-09", kind: "learn", estimatedMinutes: 5, completedAt: "2026-09-09T08:10:00.000Z" },
      { id: "remaining", listId: "L02", dueDate: "2026-09-09", kind: "review", estimatedMinutes: 5 },
    ];

    expect(recordDailyCompletion(profile, "2026-09-09", "2026-09-09T08:10:00.000Z").dailyCompletions).toEqual([]);
  });
});
