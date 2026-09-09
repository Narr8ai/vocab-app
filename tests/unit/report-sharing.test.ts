import { describe, expect, it } from "vitest";
import { formatReportForSharing } from "../../src/domain/report-sharing";
import type { ReportViewModel } from "../../src/domain/reports";

const report: ReportViewModel = {
  audience: "parent", sampleSize: 12, meaningRate: 0.75, spellingRate: null, onTimeReviewRate: 0.5,
  dueReviewCount: 2, overdueReviewCount: 1, weakWordIds: ["L01-abandon"], message: "建议先完成复习。",
  periodStart: "2026-09-03", periodEnd: "2026-09-09", generatedAt: "2026-09-09T08:00:00.000Z",
};

describe("shareable report summary", () => {
  it("labels the audience, period, evidence, and one next action", () => {
    const summary = formatReportForSharing(report, "家长");
    expect(summary).toContain("家长学习摘要");
    expect(summary).toContain("2026-09-03 至 2026-09-09");
    expect(summary).toContain("12 次");
    expect(summary).toContain("建议先完成复习。");
  });
});
