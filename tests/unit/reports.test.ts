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
});
