import { describe, expect, it } from "vitest";
import { getStoryWordIds, validateStoryUnit } from "../../src/domain/story-learning";
import { STORY_UNITS, getStoryUnit } from "../../src/data/stories";

describe("story catalog", () => {
  it("contains every list once in L01 through L26 order", () => {
    expect(STORY_UNITS.map((unit) => unit.listId)).toEqual(
      Array.from({ length: 26 }, (_, index) => `L${String(index + 1).padStart(2, "0")}`),
    );
  });

  it("provides complete, valid, readable story units", () => {
    for (const unit of STORY_UNITS) {
      expect(validateStoryUnit(unit)).toEqual([]);
      expect(unit.paragraphs).toHaveLength(3);
      expect(getStoryWordIds(unit)).toHaveLength(6);
      expect(new Set(getStoryWordIds(unit))).toHaveLength(6);
      expect(unit.title.trim()).not.toBe("");
      expect(unit.hook.trim()).not.toBe("");
      expect(Object.values(unit.usageNotes).every((note) => note.trim() !== "")).toBe(true);
      expect(unit.recallPrompts.every((prompt) => prompt.cue.trim() !== "")).toBe(true);
    }
  });

  it("looks up L08 and explains an unknown story ID", () => {
    expect(getStoryUnit("L08").listId).toBe("L08");
    expect(() => getStoryUnit("L99")).toThrow("Unknown story unit: L99");
  });

  it("keeps reviewed target-word contexts and plot cues aligned", () => {
    const textFor = (listId: string) => getStoryUnit(listId).paragraphs
      .flatMap((paragraph) => paragraph.segments)
      .map((segment) => segment.type === "text" ? segment.text : segment.wordId)
      .join("");
    const promptFor = (listId: string, wordId: string) => getStoryUnit(listId).recallPrompts
      .find((prompt) => prompt.wordId === wordId);

    expect(textFor("L08")).toContain("定位蓝光来源");
    expect(getStoryUnit("L08").usageNotes["L08-objective"]).toBe("指小组定位蓝光来源的明确目标。");
    expect(promptFor("L08", "L08-objective")?.cue).toBe("社长为调查蓝光定下了什么目标？");

    expect(getStoryUnit("L09").usageNotes["L09-occur"]).toBe("指堵车事故刚刚发生。");
    expect(promptFor("L09", "L09-occur")?.cue).toBe("是什么意外刚刚发生，让首席迟到？");

    expect(getStoryUnit("L03").usageNotes["L03-acquaint"]).toBe("指成员先熟悉鸟窝任务。");
    expect(promptFor("L03", "L03-acquaint")?.cue).toBe("成员先让自己熟悉了什么？");

    expect(textFor("L24")).toContain("震动时先在结实桌下暂时躲避");
    expect(textFor("L24")).toContain("远离建筑物的开阔区域集合");
    expect(getStoryUnit("L24").usageNotes["L24-shelter"]).toBe("指震动时结实桌下提供的暂时遮蔽处。");
    expect(promptFor("L24", "L24-shelter")?.cue).toBe("震动时，大家先在哪里暂时躲避？");
  });
});
