import "../styles.css";
import { AppService } from "../application/app-service";
import { clearActiveLearning, saveActiveLearning } from "../domain/active-learning";
import { calendarDate } from "../domain/calendar";
import { meaningChoices } from "../domain/meaning-quiz";
import { recordDailyCompletion } from "../domain/progress";
import { getTodayQueue, scheduleReviews } from "../domain/scheduler";
import { isSpellingCorrect, submitAttempt } from "../domain/learning";
import { buildReport, type ReportAudience } from "../domain/reports";
import { getList, type ListId, type VocabList } from "../data/vocab";
import type { ActiveLearning, LearningStep } from "../domain/types";
import { LocalStorageProfileRepository } from "../infrastructure/local-storage-repository";
import { loadDemoProfile } from "../data/demo-profile";

const now = () => new Date().toISOString();
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai";
const today = () => calendarDate(now(), timezone);
const repository = new LocalStorageProfileRepository(window.localStorage, timezone, now);
const service = new AppService(repository);
const ids = { next: (prefix: string) => `${prefix}-${crypto.randomUUID()}` };
const root = document.querySelector<HTMLElement>("#real-learning-root");
let demoMode = false;

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

function checkpoint(taskId: string, listId: ListId, step: LearningStep, wordIds: string[], meaningResults?: { wordId: string; correct: boolean }[]): void {
  if (demoMode) return;
  const profile = repository.load("real").profile;
  repository.save(saveActiveLearning(profile, { taskId, listId, step, wordIds, meaningResults }), "real");
}

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
  const demo = element("button", "查看示例数据"); demo.className = "secondary"; demo.addEventListener("click", () => { demoMode = true; renderDaily(); }); shell.append(demo);
  clearAndShow(shell);
}

function showStudy(taskId: string, listId: ListId, estimatedMinutes: number): void {
  const list = getList(listId); const words = list.words.slice(0, 6);
  checkpoint(taskId, listId, "study", words.map((word) => word.id));
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

type RecordedAttempt = { kind: "meaning" | "spelling"; results: { wordId: string; correct: boolean }[] };

function showCompletion(): void {
  const done = card("学习记录已保存");
  done.append(element("p", "这次词义和拼写结果已经计入真实学习记录；后续复习会按计划出现。"));
  const back = element("button", "返回今日任务"); back.addEventListener("click", renderDaily); done.append(back); clearAndShow(done);
}

function saveCompletedTask(taskId: string, listId: ListId, attempts: RecordedAttempt[]): void {
  const profile = repository.load("real").profile;
  const task = profile.tasks.find((candidate) => candidate.id === taskId);
  if (!task) throw new Error("未找到本次学习任务，请返回今日任务后重试。");
  const occurredAt = now();
  const withAttempts = attempts.reduce((current, attempt) => submitAttempt({
    attemptId: ids.next("attempt"), taskId, listId, kind: attempt.kind, reviewOccurrenceId: taskId, occurredAt, results: attempt.results,
  }, current), profile);
  const completedTask = { ...task, completedAt: occurredAt };
  const reviewTasks = scheduleReviews(completedTask, withAttempts, { now }, ids);
  const updated = {
    ...withAttempts,
    tasks: withAttempts.tasks.map((candidate) => candidate.id === taskId ? completedTask : candidate).concat(reviewTasks),
  };
  repository.save(clearActiveLearning(recordDailyCompletion(updated, calendarDate(occurredAt, timezone), occurredAt), taskId), "real");
}

function showSpelling(taskId: string, listId: ListId, meaningResults: { wordId: string; correct: boolean }[], wordIds: string[]): void {
  checkpoint(taskId, listId, "spelling", wordIds, meaningResults);
  const shell = card("拼写回忆");
  shell.append(element("p", "根据中文释义输入英文单词。大小写和首尾空格不会影响判定。"));
  const answers = new Map<string, string>();
  for (const wordId of wordIds) {
    const word = getList(listId).words.find((candidate) => candidate.id === wordId)!;
    const row = element("div"); row.className = "word-unit";
    const input = element("input") as HTMLInputElement; input.placeholder = "输入英文单词";
    input.addEventListener("input", () => answers.set(wordId, input.value));
    row.append(element("strong", word.meaning), input); shell.append(row);
  }
  const submit = element("button", "提交拼写并完成本次学习");
  submit.addEventListener("click", () => {
    if (answers.size !== wordIds.length) { shell.append(element("p", "请完成每个拼写题。")); return; }
    if (demoMode) { const done = card("演示数据不会保存"); done.append(element("p", "你正在查看示例学习记录，退出演示后真实学习数据不会改变。")); const back = element("button", "退出演示"); back.addEventListener("click", () => { demoMode = false; renderDaily(); }); done.append(back); clearAndShow(done); return; }
    try {
      saveCompletedTask(taskId, listId, [
        { kind: "meaning", results: meaningResults },
        { kind: "spelling", results: wordIds.map((wordId) => {
          const word = getList(listId).words.find((candidate) => candidate.id === wordId)!;
          return { wordId, correct: isSpellingCorrect(answers.get(wordId) ?? "", word.spelling) };
        }) },
      ]);
      showCompletion();
    } catch (error) { shell.append(element("p", error instanceof Error ? error.message : "保存失败，请重试。")); }
  });
  shell.append(submit); clearAndShow(shell);
}

function showMeaningQuiz(taskId: string, listId: ListId, wordIds: string[]): void {
  checkpoint(taskId, listId, "meaning", wordIds);
  const results: { wordId: string; correct: boolean }[] = [];
  let position = 0;
  const renderQuestion = (): void => {
    if (position === wordIds.length) {
      const spellingIds = wordIds.filter((wordId) => getList(listId).words.find((word) => word.id === wordId)?.defaultSpellingRequired);
      if (spellingIds.length) { showSpelling(taskId, listId, results, spellingIds); return; }
      if (demoMode) { const done = card("演示数据不会保存"); done.append(element("p", "你正在查看示例学习记录，退出演示后真实学习数据不会改变。")); const back = element("button", "退出演示"); back.addEventListener("click", () => { demoMode = false; renderDaily(); }); done.append(back); clearAndShow(done); return; }
      try { saveCompletedTask(taskId, listId, [{ kind: "meaning", results }]); showCompletion(); }
      catch (error) { const shell = card("保存失败"); shell.append(element("p", error instanceof Error ? error.message : "请返回今日任务后重试。")); clearAndShow(shell); }
      return;
    }
    const wordId = wordIds[position];
    const word = getList(listId).words.find((candidate) => candidate.id === wordId)!;
    const shell = card(`词义测试 ${position + 1}/${wordIds.length}`);
    shell.append(element("p", `请选择 ${word.spelling} 最合适的中文释义。`));
    for (const choice of meaningChoices(listId, wordId)) {
      const button = element("button", choice); button.className = "secondary";
      button.addEventListener("click", () => {
        const correct = choice === word.meaning;
        results.push({ wordId, correct });
        shell.append(element("p", correct ? "回答正确。" : `正确答案：${word.meaning}`));
        const next = element("button", position + 1 === wordIds.length ? "进入下一步" : "下一题");
        next.addEventListener("click", () => { position += 1; renderQuestion(); }); shell.append(next);
        for (const sibling of [...shell.querySelectorAll("button.secondary")]) (sibling as HTMLButtonElement).disabled = true;
      });
      shell.append(button);
    }
    clearAndShow(shell);
  };
  renderQuestion();
}

function showRecall(taskId: string, listId: ListId, wordIds: string[]): void {
  checkpoint(taskId, listId, "recall", wordIds);
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
  const submit = element("button", "进入词义测试");
  submit.addEventListener("click", () => {
    if (ratings.size !== wordIds.length) { shell.append(element("p", "请为每个单词选择一个回忆结果。")); return; }
    showMeaningQuiz(taskId, listId, wordIds);
  });
  shell.append(submit); clearAndShow(shell);
}

function resumeActiveLearning(active: ActiveLearning, estimatedMinutes: number): void {
  const listId = active.listId as ListId;
  if (active.step === "recall") { showRecall(active.taskId, listId, active.wordIds); return; }
  if (active.step === "meaning") { showMeaningQuiz(active.taskId, listId, active.wordIds); return; }
  if (active.step === "spelling") { showSpelling(active.taskId, listId, active.meaningResults ?? [], active.wordIds); return; }
  showStudy(active.taskId, listId, estimatedMinutes);
}

function renderDaily(): void {
  const loaded = demoMode ? { profile: loadDemoProfile(), warning: undefined } : repository.load("real");
  if (loaded.profile.plans.length === 0) { showPlanSetup(); return; }
  const queue = getTodayQueue(loaded.profile, today(), 15);
  const shell = card("继续今天的学习");
  shell.append(element("p", queue.length ? `今天有 ${queue.length} 个待完成任务，复习任务会优先安排。` : "今天没有待完成任务。完成学习后，复习会在后续日期自动出现。"));
  if (demoMode) { const badge = element("p", "演示模式：示例数据不会写入你的真实学习记录。"); badge.className = "notice"; shell.append(badge); }
  if (loaded.warning) { const warning = element("p", loaded.warning); warning.className = "notice"; shell.append(warning); }
  const task = queue[0];
  if (task) {
    const active = loaded.profile.activeLearning;
    const resumable = active?.taskId === task.id;
    const start = element("button", `${resumable ? "继续" : "开始"} ${task.kind === "review" ? "复习" : "学习"} ${task.listId}`);
    start.addEventListener("click", () => resumable ? resumeActiveLearning(active, task.estimatedMinutes) : showStudy(task.id, task.listId, task.estimatedMinutes)); shell.append(start);
  }
  const restart = element("button", "新建计划"); restart.className = "secondary"; restart.addEventListener("click", showPlanSetup); shell.append(restart); clearAndShow(shell);
  const report = element("button", "查看学习报告"); report.className = "secondary"; report.addEventListener("click", () => showReport("student")); shell.append(report);
  if (demoMode) { const exit = element("button", "退出演示"); exit.className = "secondary"; exit.addEventListener("click", () => { demoMode = false; renderDaily(); }); shell.append(exit); }
}

function showReport(audience: ReportAudience, listId?: ListId): void {
  const report = buildReport(demoMode ? loadDemoProfile() : repository.load("real").profile, { audience, listId, period: "week", asOf: now() });
  const labels: Record<ReportAudience, string> = { student: "学生", parent: "家长", teacher: "老师" };
  const shell = card(`${labels[audience]}报告`);
  if (demoMode) { const badge = element("p", "演示模式：以下为示例数据，不会写入真实学习记录。"); badge.className = "notice"; shell.append(badge); }
  const scopeLabel = element("label", "查看范围");
  const scope = element("select");
  const all = element("option", "全部词表"); all.value = ""; scope.append(all);
  for (let number = 1; number <= 26; number += 1) {
    const option = element("option", `List ${number}`); option.value = `L${String(number).padStart(2, "0")}`;
    if (option.value === listId) option.selected = true;
    scope.append(option);
  }
  scope.addEventListener("change", () => showReport(audience, scope.value || undefined));
  shell.append(scopeLabel, scope);
  shell.append(element("p", `统计区间：${report.periodStart} 至 ${report.periodEnd}。`));
  shell.append(element("p", `作答样本：${report.sampleSize} 次；词义正确率：${report.meaningRate === null ? "暂无" : `${Math.round(report.meaningRate * 100)}%`}；拼写正确率：${report.spellingRate === null ? "暂无" : `${Math.round(report.spellingRate * 100)}%`}。`));
  shell.append(element("p", `到期复习：${report.dueReviewCount} 项；按时完成率：${report.onTimeReviewRate === null ? "暂无" : `${Math.round(report.onTimeReviewRate * 100)}%`}；需要跟进：${report.overdueReviewCount} 项。`));
  shell.append(element("p", report.message));
  if (audience === "parent") { const notice = element("p", "提示：目前学习数据仅保存在这台设备；跨设备家庭周报将在账户版本提供。"); notice.className = "notice"; shell.append(notice); }
  if (report.weakWordIds.length) shell.append(element("p", `需要复习：${report.weakWordIds.join("、")}`));
  for (const nextAudience of ["student", "parent", "teacher"] as const) {
    const button = element("button", labels[nextAudience]); button.className = "secondary"; button.addEventListener("click", () => showReport(nextAudience)); shell.append(button);
  }
  const back = element("button", "返回今日任务"); back.addEventListener("click", renderDaily); shell.append(back); clearAndShow(shell);
}

export function bootstrap(): void { renderDaily(); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap, { once: true }); else bootstrap();
