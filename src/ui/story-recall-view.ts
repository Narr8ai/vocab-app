import { getStoryWordIds, storyRecallChoices, type StoryUnit } from "../domain/story-learning";

export interface StoryRecallOptions {
  unit: StoryUnit;
  wordIds?: readonly string[];
  resolveSpelling: (wordId: string) => string;
  onComplete: (wordIds: string[]) => void;
}

export function renderStoryRecall({ unit, wordIds: savedWordIds, resolveSpelling, onComplete }: StoryRecallOptions): HTMLElement {
  const view = document.createElement("section");
  view.className = "story-recall-card";
  const wordIds = savedWordIds ? [...savedWordIds] : getStoryWordIds(unit);
  let questionIndex = 0;
  let completed = false;

  const renderQuestion = (): void => {
    const prompt = unit.recallPrompts[questionIndex];
    const answer = resolveSpelling(prompt.wordId);
    const choices = storyRecallChoices(unit, prompt.wordId)
      .map(resolveSpelling)
      .filter((spelling, index, all) => spelling !== "" && all.indexOf(spelling) === index);
    const rotatedChoices = choices.map((_, index) => choices[(index + questionIndex) % choices.length]);

    view.replaceChildren();
    const progress = document.createElement("p");
    progress.className = "story-recall-progress";
    progress.textContent = "故事情节回忆 · 第 2/4 步";
    const position = document.createElement("p");
    position.className = "story-recall-position";
    position.textContent = `第 ${questionIndex + 1}/${wordIds.length} 题`;
    const cue = document.createElement("h1");
    cue.className = "story-recall-cue";
    cue.textContent = prompt.cue;
    const options = document.createElement("div");
    options.className = "story-recall-options";
    const feedback = document.createElement("p");
    feedback.className = "story-recall-feedback";
    feedback.setAttribute("role", "status");
    feedback.hidden = true;
    const next = document.createElement("button");
    next.type = "button";
    next.className = "story-recall-next";
    next.hidden = true;
    next.textContent = questionIndex + 1 === wordIds.length ? "进入词义测试" : "下一题";

    for (const choice of rotatedChoices) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "story-recall-option";
      option.textContent = choice;
      option.addEventListener("click", () => {
        const correct = choice === answer;
        for (const button of options.querySelectorAll<HTMLButtonElement>("button")) button.disabled = true;
        feedback.hidden = false;
        feedback.textContent = correct ? "回答正确。" : `回答不正确。正确拼写：${answer}`;
        next.hidden = false;
      });
      options.append(option);
    }

    next.addEventListener("click", () => {
      if (questionIndex + 1 < wordIds.length) {
        questionIndex += 1;
        renderQuestion();
        return;
      }
      if (!completed) {
        completed = true;
        onComplete([...wordIds]);
      }
    });
    view.append(progress, position, cue, options, feedback, next);
  };

  renderQuestion();
  return view;
}
