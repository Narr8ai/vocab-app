// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { getStoryUnit } from "../../src/data/stories";
import { getList } from "../../src/data/vocab";
import { getStoryWordIds } from "../../src/domain/story-learning";
import { createEmptyProfile } from "../../src/domain/profile";
import { renderStoryRecall } from "../../src/ui/story-recall-view";

const unit = getStoryUnit("L01");
const wordIds = getStoryWordIds(unit);
const resolveSpelling = (wordId: string): string => getList(unit.listId).words.find((word) => word.id === wordId)?.spelling ?? "";

describe("renderStoryRecall", () => {
  it("shows the first plot cue, rotates three spelling choices, and waits for 下一题 after a wrong answer", () => {
    const view = renderStoryRecall({ unit, resolveSpelling, onComplete: vi.fn() });
    const firstPrompt = unit.recallPrompts[0];
    const firstAnswer = resolveSpelling(firstPrompt.wordId);
    const choices = [...view.querySelectorAll<HTMLButtonElement>(".story-recall-option")];

    expect(view.textContent).toContain("故事情节回忆 · 第 2/4 步");
    expect(view.textContent).toContain("第 1/6 题");
    expect(view.textContent).toContain("丢稿后大家差点怎样做？");
    expect(choices.map((choice) => choice.textContent)).toHaveLength(3);
    expect(new Set(choices.map((choice) => choice.textContent))).toHaveLength(3);
    expect(view.textContent).not.toContain(unit.recallPrompts[1].cue);

    const wrong = choices.find((choice) => choice.textContent !== firstAnswer)!;
    wrong.click();
    expect(choices.every((choice) => choice.disabled)).toBe(true);
    expect(view.textContent).toContain(`正确拼写：${firstAnswer}`);
    expect(view.querySelector(".story-recall-feedback")?.getAttribute("role")).toBe("status");
    expect(view.textContent).toContain("下一题");
    expect(view.textContent).not.toContain(unit.recallPrompts[1].cue);

    view.querySelector<HTMLButtonElement>(".story-recall-next")!.click();
    expect(view.textContent).toContain(unit.recallPrompts[1].cue);
  });

  it("reports a correct answer and completes once with the original six story IDs", () => {
    const onComplete = vi.fn();
    const view = renderStoryRecall({ unit, resolveSpelling, onComplete });
    const correctPositions: number[] = [];

    for (let question = 0; question < wordIds.length; question += 1) {
      const answer = resolveSpelling(unit.recallPrompts[question].wordId);
      const choices = [...view.querySelectorAll<HTMLButtonElement>(".story-recall-option")];
      correctPositions.push(choices.findIndex((choice) => choice.textContent === answer));
      choices.find((choice) => choice.textContent === answer)!.click();
      expect(view.textContent).toContain("回答正确。");
      view.querySelector<HTMLButtonElement>(".story-recall-next")!.click();
    }

    expect(new Set(correctPositions).size).toBeGreaterThan(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(wordIds);
  });

  it("returns supplied saved IDs after plot recall so a resumed flow keeps its original word group", () => {
    const savedWordIds = getList(unit.listId).words.slice(0, 6).map((word) => word.id);
    const onComplete = vi.fn();
    const view = renderStoryRecall({ unit, wordIds: savedWordIds, resolveSpelling, onComplete });

    for (let question = 0; question < unit.recallPrompts.length; question += 1) {
      const answer = resolveSpelling(unit.recallPrompts[question].wordId);
      view.querySelectorAll<HTMLButtonElement>(".story-recall-option").forEach((choice) => {
        if (choice.textContent === answer) choice.click();
      });
      view.querySelector<HTMLButtonElement>(".story-recall-next")!.click();
    }

    expect(savedWordIds).not.toEqual(wordIds);
    expect(onComplete).toHaveBeenCalledWith(savedWordIds);
  });

  it("resumes recall into a meaning quiz for the checkpointed word group", async () => {
    const root = document.createElement("main");
    root.id = "real-learning-root";
    document.body.replaceChildren(root);
    window.localStorage.clear();
    const savedWordIds = getList(unit.listId).words.slice(0, 6).map((word) => word.id).reverse();
    const profile = createEmptyProfile("real-profile", "Asia/Shanghai", new Date().toISOString());
    profile.plans = [{ id: "plan-1", name: "计划", listIds: [unit.listId], createdAt: profile.createdAt }];
    profile.tasks = [{ id: "task-1", listId: unit.listId, dueDate: new Date().toISOString().slice(0, 10), kind: "learn", estimatedMinutes: 5 }];
    profile.activeLearning = { taskId: "task-1", listId: unit.listId, step: "recall", wordIds: savedWordIds };
    window.localStorage.setItem("vocab-app:profile:real:v1", JSON.stringify(profile));

    vi.resetModules();
    await import("../../src/ui/app");
    root.querySelector<HTMLButtonElement>("button")!.click();
    for (const prompt of unit.recallPrompts) {
      const answer = resolveSpelling(prompt.wordId);
      [...root.querySelectorAll<HTMLButtonElement>(".story-recall-option")].find((choice) => choice.textContent === answer)!.click();
      root.querySelector<HTMLButtonElement>(".story-recall-next")!.click();
    }

    expect(root.textContent).toContain(`请选择 ${resolveSpelling(savedWordIds[0])} 最合适的中文释义。`);
    const checkpoint = JSON.parse(window.localStorage.getItem("vocab-app:profile:real:v1") ?? "{}");
    expect(checkpoint.activeLearning.wordIds).toEqual(savedWordIds);
  });
});
