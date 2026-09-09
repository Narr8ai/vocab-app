import type { ReportViewModel } from "./reports";

const percent = (value: number | null) => value === null ? "暂无" : `${Math.round(value * 100)}%`;

export function formatReportForSharing(report: ReportViewModel, audienceLabel: string): string {
  return [
    `${audienceLabel}学习摘要`,
    `统计区间：${report.periodStart} 至 ${report.periodEnd}`,
    `作答样本：${report.sampleSize} 次；词义正确率：${percent(report.meaningRate)}；拼写正确率：${percent(report.spellingRate)}`,
    `到期复习：${report.dueReviewCount} 项；按时完成率：${percent(report.onTimeReviewRate)}；需要跟进：${report.overdueReviewCount} 项`,
    `建议：${report.message}`,
    "数据来自学生当前设备的学习记录。",
  ].join("\n");
}
