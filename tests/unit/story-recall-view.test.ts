// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { getStoryUnit } from "../../src/data/stories";
import { getList } from "../../src/data/vocab";
import { getStoryWordIds } from "../../src/domain/story-learning";
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
});
