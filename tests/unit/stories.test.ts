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
});
