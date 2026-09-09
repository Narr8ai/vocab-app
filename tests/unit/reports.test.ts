import { describe, expect, it } from "vitest";
import { buildReport } from "../../src/domain/reports";
import { createEmptyProfile } from "../../src/domain/profile";

describe("shared-evidence reports", () => {
  it("gives all audiences the same underlying attempt facts", () => {
    const profile = createEmptyProfile("student", "Asia/Shanghai", "2026-09-09T08:00:00.000Z");
    profile.attempts = [{ id: "a1", taskId: "t1", listId: "L01", kind: "meaning", reviewOccurrenceId: "r1", occurredAt: "2026-09-09T08:00:00.000Z", results: [{ wordId: "w1", correct: true }, { wordId: "w2", correct: false }] }];

    const student = buildReport(profile, { audience: "student", period: "week" });
    const parent = buildReport(profile, { audience: "parent", period: "week" });
    const teacher = buildReport(profile, { audience: "teacher", period: "week" });

    expect([student, parent, teacher].map((report) => report.sampleSize)).toEqual([2, 2, 2]);
    expect([student, parent, teacher].map((report) => report.meaningRate)).toEqual([0.5, 0.5, 0.5]);
  });

  it("shows no due reviews rather than a misleading perfect rate", () => {
    const profile = createEmptyProfile("student", "Asia/Shanghai", "2026-09-09T08:00:00.000Z");
    const report = buildReport(profile, { audience: "parent", period: "week" });
    expect(report.onTimeReviewRate).toBeNull();
    expect(report.message).toContain("没有到期复习");
  });

  it("filters only the selected list scope", () => {
    const profile = createEmptyProfile("student", "Asia/Shanghai", "2026-09-09T08:00:00.000Z");
    profile.attempts = [
      { id: "a1", taskId: "t1", listId: "L01", kind: "meaning", reviewOccurrenceId: "r1", occurredAt: "2026-09-09T08:00:00.000Z", results: [{ wordId: "w1", correct: true }] },
      { id: "a2", taskId: "t2", listId: "L02", kind: "meaning", reviewOccurrenceId: "r2", occurredAt: "2026-09-09T08:00:00.000Z", results: [{ wordId: "w2", correct: false }] },
    ];
    expect(buildReport(profile, { audience: "teacher", listId: "L01", period: "week" }).sampleSize).toBe(1);
  });

  it("derives timely and overdue review evidence from completed tasks", () => {
    const profile = createEmptyProfile("student", "Asia/Shanghai", "2026-09-01T08:00:00.000Z");
    profile.tasks = [
      { id: "on-time", listId: "L01", dueDate: "2026-09-07", kind: "review", estimatedMinutes: 5, completedAt: "2026-09-07T09:00:00.000Z" },
      { id: "late", listId: "L01", dueDate: "2026-09-07", kind: "review", estimatedMinutes: 5, completedAt: "2026-09-08T09:00:00.000Z" },
      { id: "missed", listId: "L01", dueDate: "2026-09-07", kind: "review", estimatedMinutes: 5 },
      { id: "future", listId: "L01", dueDate: "2026-09-10", kind: "review", estimatedMinutes: 5 },
    ];

    const report = buildReport(profile, { audience: "teacher", period: "week", asOf: "2026-09-09T12:00:00.000Z" });

    expect(report.onTimeReviewRate).toBeCloseTo(1 / 3);
    expect(report.dueReviewCount).toBe(3);
    expect(report.overdueReviewCount).toBe(2);
    expect(report.message).toContain("2 项需要跟进");
  });

  it("uses audience-specific guidance while retaining the same evidence", () => {
    const profile = createEmptyProfile("student", "Asia/Shanghai", "2026-09-09T08:00:00.000Z");
    profile.attempts = [{ id: "a1", taskId: "t1", listId: "L01", kind: "meaning", reviewOccurrenceId: "r1", occurredAt: "2026-09-09T08:00:00.000Z", results: [{ wordId: "w1", correct: false }] }];

    const parent = buildReport(profile, { audience: "parent", period: "week", asOf: "2026-09-09T12:00:00.000Z" });
    const student = buildReport(profile, { audience: "student", period: "week", asOf: "2026-09-09T12:00:00.000Z" });

    expect(parent.sampleSize).toBe(student.sampleSize);
    expect(parent.message).toContain("陪孩子");
    expect(student.message).toContain("优先复习");
  });

  it("includes only recorded effective learning time in the report period", () => {
    const profile = createEmptyProfile("student", "Asia/Shanghai", "2026-09-09T08:00:00.000Z");
    profile.sessions = [
      { id: "in-period", taskId: "t1", startedAt: "2026-09-09T08:00:00.000Z", activeSeconds: 180 },
      { id: "outside", taskId: "t2", startedAt: "2026-08-01T08:00:00.000Z", activeSeconds: 600 },
    ];

    expect(buildReport(profile, { audience: "teacher", period: "week", asOf: "2026-09-09T12:00:00.000Z" }).activeMinutes).toBe(3);
  });
});
