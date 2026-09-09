import { describe, expect, it } from "vitest";
import { meaningChoices } from "../../src/domain/meaning-quiz";

describe("meaning quiz choices", () => {
  it("contains the correct meaning and distinct same-list distractors", () => {
    const choices = meaningChoices("L01", "L01-abandon");

    expect(choices).toContain("v. 放弃，抛弃");
    expect(new Set(choices)).toHaveLength(4);
  });
});
