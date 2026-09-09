import { describe, expect, it } from "vitest";
import { clearActiveLearning, saveActiveLearning } from "../../src/domain/active-learning";
import { createEmptyProfile } from "../../src/domain/profile";

describe("active learning checkpoint", () => {
  it("persists the unfinished step and clears only its completed task", () => {
    const profile = createEmptyProfile("student", "Asia/Shanghai", "2026-09-09T08:00:00.000Z");
    const saved = saveActiveLearning(profile, { taskId: "task-1", listId: "L01", step: "spelling", wordIds: ["w1"], meaningResults: [{ wordId: "w1", correct: true }] });

    expect(saved.activeLearning?.step).toBe("spelling");
    expect(clearActiveLearning(saved, "other-task").activeLearning?.taskId).toBe("task-1");
    expect(clearActiveLearning(saved, "task-1").activeLearning).toBeUndefined();
  });
});
