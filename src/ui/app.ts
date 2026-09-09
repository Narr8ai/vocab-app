import "../styles.css";
import { AppService } from "../application/app-service";
import { getTodayQueue } from "../domain/scheduler";
import { submitAttempt } from "../domain/learning";
import { buildReport, type ReportAudience } from "../domain/reports";
import { getList, type ListId, type VocabList } from "../data/vocab";
import { LocalStorageProfileRepository } from "../infrastructure/local-storage-repository";

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const repository = new LocalStorageProfileRepository(window.localStorage, Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai", now);
const service = new AppService(repository);
const ids = { next: (prefix: string) => `${prefix}-${crypto.randomUUID()}` };
const root = document.querySelector<HTMLElement>("#real-learning-root");

export function getSelectedList(listId: ListId): VocabList { return getList(listId); }

function element<K extends keyof HTMLElementTagNameMap>(name: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(name);
  if (text) node.textContent = text;
  return node;
}

function card(title: string): HTMLElement {
  const shell = element("div"); shell.className = "daily-card";
  shell.append(element("h2", title));
  return shell;
}

function clearAndShow(node: HTMLElement): void { root?.replaceChildren(node); }

function showPlanSetup(): void {
  const shell = card("开始真实学习计划");
  shell.append(element("p", "选择第一个词表和每天可投入的时间。学习记录只保存在当前设备。"));
  const listLabel = element("label", "从哪个 List 开始");
  const list = element("select");
  for (let number = 1; number <= 26; number += 1) {
    const option = element("option", `List ${number}`); option.value = `L${String(number).padStart(2, "0")}`; list.append(option);
  }
  const minutesLabel = element("label", "每天学习分钟数（5–30）");
  const minutes = element("input") as HTMLInputElement; minutes.type = "number"; minutes.value = "15"; minutes.min = "5"; minutes.max = "30";
  const start = element("button", "创建今天的计划");
  start.addEventListener("click", () => {
    try {
      service.createPlan({ name: "我的词汇计划", listIds: [list.value], startDate: today(), dailyWordTarget: 8, dailyMinuteLimit: Number(minutes.value) }, "real", { clock: { now }, ids });
      renderDaily();
    } catch (error) { shell.append(element("p", error instanceof Error ? error.message : "计划创建失败。")); }
  });
  shell.append(listLabel, list, minutesLabel, minutes, start);
  clearAndShow(shell);
}

function showStudy(taskId: string, listId: ListId, estimatedMinutes: number): void {
  const list = getList(listId); const words = list.words.slice(0, 6);
  const shell = card(`今天学习 · ${list.title}`);
  shell.append(element("p", `本次约 ${estimatedMinutes} 分钟，先认识 ${words.length} 个单词，再做主动回忆。`));
  for (const word of words) {
    const row = element("div"); row.className = "word-unit";
    row.append(element("strong", word.spelling), element("p", `${word.phonetic} · ${word.meaning}`)); shell.append(row);
  }
  const continueButton = element("button", "进入主动回忆");
  continueButton.addEventListener("click", () => showRecall(taskId, listId, words.map((word) => word.id)));
  shell.append(continueButton); clearAndShow(shell);
}

function showRecall(taskId: string, listId: ListId, wordIds: string[]): void {
  const shell = card("主动回忆");
  shell.append(element("p", "先根据英文回忆意思，再选择你的把握程度。"));
  const ratings = new Map<string, boolean>();
  for (const wordId of wordIds) {
    const word = getList(listId).words.find((candidate) => candidate.id === wordId)!;
    const row = element("div"); row.className = "word-unit";
    row.append(element("strong", word.spelling));
    for (const [label, correct] of [["认识", true], ["不确定", false], ["不会", false]] as const) {
      const button = element("button", label); button.className = "secondary";
      button.addEventListener("click", () => { ratings.set(wordId, correct); row.dataset.rated = "true"; }); row.append(button);
    }
    shell.append(row);
  }
  const submit = element("button", "提交回忆并完成本次学习");
  submit.addEventListener("click", () => {
    if (ratings.size !== wordIds.length) { shell.append(element("p", "请为每个单词选择一个回忆结果。")); return; }
    const profile = repository.load("real").profile;
    const updated = submitAttempt({ attemptId: ids.next("attempt"), taskId, listId, kind: "meaning", reviewOccurrenceId: taskId, occurredAt: now(), results: wordIds.map((wordId) => ({ wordId, correct: ratings.get(wordId) === true })) }, profile);
    repository.save(updated, "real");
    const done = card("学习记录已保存");
    done.append(element("p", "这次回忆结果已经计入真实学习记录。后续复习会按计划出现。"));
    const back = element("button", "返回今日任务"); back.addEventListener("click", renderDaily); done.append(back); clearAndShow(done);
  });
  shell.append(submit); clearAndShow(shell);
}

function renderDaily(): void {
  const loaded = repository.load("real");
  if (loaded.profile.plans.length === 0) { showPlanSetup(); return; }
  const queue = getTodayQueue(loaded.profile, today(), 15);
  const shell = card("继续今天的学习");
  shell.append(element("p", queue.length ? `今天有 ${queue.length} 个待完成任务，复习任务会优先安排。` : "今天没有待完成任务。完成学习后，复习会在后续日期自动出现。"));
  if (loaded.warning) { const warning = element("p", loaded.warning); warning.className = "notice"; shell.append(warning); }
  const task = queue[0];
  if (task) { const start = element("button", `开始 ${task.kind === "review" ? "复习" : "学习"} ${task.listId}`); start.addEventListener("click", () => showStudy(task.id, task.listId, task.estimatedMinutes)); shell.append(start); }
  const restart = element("button", "新建计划"); restart.className = "secondary"; restart.addEventListener("click", showPlanSetup); shell.append(restart); clearAndShow(shell);
  const report = element("button", "查看学习报告"); report.className = "secondary"; report.addEventListener("click", () => showReport("student")); shell.append(report);
}

function showReport(audience: ReportAudience): void {
  const report = buildReport(repository.load("real").profile, { audience, period: "week" });
  const labels: Record<ReportAudience, string> = { student: "学生", parent: "家长", teacher: "老师" };
  const shell = card(`${labels[audience]}报告`);
  shell.append(element("p", `本周样本：${report.sampleSize} 次作答；词义正确率：${report.meaningRate === null ? "暂无" : `${Math.round(report.meaningRate * 100)}%`}。`));
  shell.append(element("p", report.message));
  if (report.weakWordIds.length) shell.append(element("p", `需要复习：${report.weakWordIds.join("、")}`));
  for (const nextAudience of ["student", "parent", "teacher"] as const) {
    const button = element("button", labels[nextAudience]); button.className = "secondary"; button.addEventListener("click", () => showReport(nextAudience)); shell.append(button);
  }
  const back = element("button", "返回今日任务"); back.addEventListener("click", renderDaily); shell.append(back); clearAndShow(shell);
}

export function bootstrap(): void { renderDaily(); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap, { once: true }); else bootstrap();
