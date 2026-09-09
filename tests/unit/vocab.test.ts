import { describe, expect, it } from "vitest";
import { getList, VOCAB_LISTS } from "../../src/data/vocab";

describe("prototype vocabulary mapping", () => {
  it("keeps every one of the 26 lists separate with sixteen uniquely identified words", () => {
    expect(VOCAB_LISTS).toHaveLength(26);
    const ids = new Set<string>();
    for (const list of VOCAB_LISTS) {
      expect(list.words).toHaveLength(16);
      expect(list.id).toMatch(/^L(?:0[1-9]|1[0-9]|2[0-6])$/);
      for (const word of list.words) {
        expect(word.id).toMatch(new RegExp(`^${list.id}-[a-z]+$`));
        expect(word.spelling).toBeTruthy();
        expect(word.phonetic).toBeTruthy();
        expect(word.meaning).toBeTruthy();
        expect(typeof word.defaultSpellingRequired).toBe("boolean");
        ids.add(`${list.id}:${word.id}`);
      }
    }
    expect(ids.size).toBe(416);
  });

  it("does not map List 1 to List 8", () => {
    const first = getList("L01");
    const eighth = getList("L08");

    expect(first.words[0].spelling).toBe("abandon");
    expect(first.words.at(-1)?.spelling).toBe("accelerate");
    expect(eighth.words[0].spelling).toBe("radiate");
    expect(eighth.words.at(-1)?.spelling).toBe("ideal");
    expect(eighth.words[0].id).toBe("L08-radiate");
    expect(eighth.words.every((word) => !/^L08-\d+$/.test(word.id))).toBe(true);
  });
});
