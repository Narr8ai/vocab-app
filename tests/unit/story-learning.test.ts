import { describe, expect, it } from "vitest";
import {
  getStoryWordIds,
  storyRecallChoices,
  validateStoryUnit,
  type StoryUnit,
} from "../../src/domain/story-learning";

const valid: StoryUnit = {
  listId: "L01",
  title: "测试故事",
  hook: "一项任务突然改变。",
  paragraphs: [
    {
      id: "p1",
      segments: [
        { type: "text", text: "他决定" },
        { type: "word", wordId: "L01-abandon" },
        { type: "text", text: "原计划。" },
      ],
    },
  ],
  usageNotes: { "L01-abandon": "abandon the plan：放弃计划" },
  recallPrompts: [{ wordId: "L01-abandon", cue: "他决定____原计划。" }],
};

describe("story learning domain", () => {
  it("accepts a valid unit and returns words in story order", () => {
    expect(validateStoryUnit(valid)).toEqual([]);
    expect(getStoryWordIds(valid)).toEqual(["L01-abandon"]);
  });

  it("rejects a word ID that is unknown to the vocabulary", () => {
    const unit = {
      ...valid,
      paragraphs: [{ ...valid.paragraphs[0], segments: [{ type: "word" as const, wordId: "L01-missing" }] }],
      usageNotes: { "L01-missing": "missing usage" },
      recallPrompts: [{ wordId: "L01-missing", cue: "缺失的词" }],
    };

    expect(validateStoryUnit(unit)).toEqual(expect.arrayContaining([expect.stringContaining("L01-missing")]));
  });

  it("rejects a vocabulary word missing from the paragraphs", () => {
    const unit = {
      ...valid,
      usageNotes: { "L01-abandon": valid.usageNotes["L01-abandon"], "L01-ability": "ability to learn：学习能力" },
      recallPrompts: [
        ...valid.recallPrompts,
        { wordId: "L01-ability", cue: "展现学习____。" },
      ],
    };

    expect(validateStoryUnit(unit)).toEqual(expect.arrayContaining([expect.stringContaining("paragraph")]));
  });

  it("rejects duplicate recall prompts", () => {
    const unit = {
      ...valid,
      recallPrompts: [...valid.recallPrompts, valid.recallPrompts[0]],
    };

    expect(validateStoryUnit(unit)).toEqual(expect.arrayContaining([expect.stringContaining("recall")]));
  });

  it("rejects a missing usage note", () => {
    const unit = { ...valid, usageNotes: {} };

    expect(validateStoryUnit(unit)).toEqual(expect.arrayContaining([expect.stringContaining("usage")]));
  });

  it("returns deterministic distinct recall choices containing the answer", () => {
    const unit: StoryUnit = {
      ...valid,
      paragraphs: [
        {
          id: "p1",
          segments: [
            { type: "word", wordId: "L01-abandon" },
            { type: "word", wordId: "L01-ability" },
            { type: "word", wordId: "L01-abnormal" },
            { type: "word", wordId: "L01-aboard" },
          ],
        },
      ],
      usageNotes: {
        "L01-abandon": "abandon usage",
        "L01-ability": "ability usage",
        "L01-abnormal": "abnormal usage",
        "L01-aboard": "aboard usage",
      },
      recallPrompts: [
        { wordId: "L01-abandon", cue: "a" },
        { wordId: "L01-ability", cue: "b" },
        { wordId: "L01-abnormal", cue: "c" },
        { wordId: "L01-aboard", cue: "d" },
      ],
    };

    const choices = storyRecallChoices(unit, "L01-abnormal");
    expect(choices).toEqual(storyRecallChoices(unit, "L01-abnormal"));
    expect(choices).toContain("L01-abnormal");
    expect(new Set(choices)).toHaveLength(choices.length);
    expect(choices.length).toBeLessThanOrEqual(3);
  });
});
