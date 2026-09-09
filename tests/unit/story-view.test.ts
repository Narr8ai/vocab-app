// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { renderStoryView } from "../../src/ui/story-view";
import type { StoryUnit } from "../../src/domain/story-learning";
import type { VocabWord } from "../../src/data/vocab";

const words: readonly VocabWord[] = [
  { id: "L01-abandon", spelling: "abandon", phonetic: "/əˈbændən/", meaning: "v. 放弃，抛弃", defaultSpellingRequired: true },
  { id: "L01-ability", spelling: "ability", phonetic: "/əˈbɪləti/", meaning: "n. 能力，才能", defaultSpellingRequired: false },
  { id: "L01-abnormal", spelling: "abnormal", phonetic: "/æbˈnɔrməl/", meaning: "adj. 不正常的，异常的", defaultSpellingRequired: false },
  { id: "L01-aboard", spelling: "aboard", phonetic: "/əˈbrd/", meaning: "adv. 在船上，上船", defaultSpellingRequired: false },
  { id: "L01-abolish", spelling: "abolish", phonetic: "/əˈbɑlɪʃ/", meaning: "v. 废除，废止", defaultSpellingRequired: true },
  { id: "L01-abortion", spelling: "abortion", phonetic: "/əˈbrʃən/", meaning: "n. 流产，堕胎", defaultSpellingRequired: false },
];

const unit: StoryUnit = {
  listId: "L01",
  title: "灯塔的选择",
  hook: "一场暴风雨让六个线索同时出现。",
  paragraphs: [
    { id: "p1", segments: [{ type: "text", text: "小队决定 " }, { type: "word", wordId: "L01-abandon" }, { type: "text", text: " 旧码头，靠自己的 " }, { type: "word", wordId: "L01-ability" }, { type: "text", text: " 找路。" }] },
    { id: "p2", segments: [{ type: "text", text: "雷达发出 " }, { type: "word", wordId: "L01-abnormal" }, { type: "text", text: " 信号，他们登上 " }, { type: "word", wordId: "L01-aboard" }, { type: "text", text: " 小船。" }] },
    { id: "p3", segments: [{ type: "text", text: "大家决定 " }, { type: "word", wordId: "L01-abolish" }, { type: "text", text: " 旧规则，避免一次危险的 " }, { type: "word", wordId: "L01-abortion" }, { type: "text", text: " 计划。" }] },
  ],
  usageNotes: {
    "L01-abandon": "在暴雨中放弃旧码头。",
    "L01-ability": "依靠团队能力辨认航向。",
    "L01-abnormal": "雷达显示异常信号。",
    "L01-aboard": "他们已经登上小船。",
    "L01-abolish": "队长决定废除旧规则。",
    "L01-abortion": "及时停止危险计划。",
  },
  recallPrompts: words.map((word) => ({ wordId: word.id, cue: `回想 ${word.spelling}` })),
};

describe("renderStoryView", () => {
  it("renders the story structure and reading progress", () => {
    const view = renderStoryView({ unit, words, estimatedMinutes: 3, onContinue: vi.fn() });
    expect(view.querySelector("h1")?.textContent).toBe(unit.title);
    expect(view.querySelector(".story-hook")?.textContent).toBe(unit.hook);
    expect(view.querySelectorAll(".story-paragraph")).toHaveLength(3);
    expect(view.querySelectorAll(".story-word")).toHaveLength(6);
    expect(view.textContent).toContain("故事阅读 · 第 1/4 步");
    expect(view.querySelector("button.story-continue")?.textContent).toContain("进入情节回忆");
    expect(view.querySelector(".story-word-detail")).toBeTruthy();
    expect((view.querySelector(".story-word-detail") as HTMLElement).hidden).toBe(true);
  });

  it("opens one word detail with exact vocabulary and usage information", () => {
    const view = renderStoryView({ unit, words, estimatedMinutes: 3, onContinue: vi.fn() });
    const buttons = [...view.querySelectorAll<HTMLButtonElement>(".story-word")];
    buttons[0].click();
    const detail = view.querySelector<HTMLElement>(".story-word-detail")!;
    expect(buttons[0].getAttribute("aria-expanded")).toBe("true");
    expect(detail.hidden).toBe(false);
    expect(detail.textContent).toContain("abandon");
    expect(detail.textContent).toContain("/əˈbændən/");
    expect(detail.textContent).toContain("v. 放弃，抛弃");
    expect(detail.textContent).toContain("在暴雨中放弃旧码头。");
  });

  it("resets the former word and reuses the detail panel", () => {
    const view = renderStoryView({ unit, words, estimatedMinutes: 3, onContinue: vi.fn() });
    const buttons = [...view.querySelectorAll<HTMLButtonElement>(".story-word")];
    const detail = view.querySelector<HTMLElement>(".story-word-detail")!;
    buttons[0].click();
    buttons[1].click();
    expect(buttons[0].getAttribute("aria-expanded")).toBe("false");
    expect(buttons[1].getAttribute("aria-expanded")).toBe("true");
    expect(view.querySelector(".story-word-detail")).toBe(detail);
    expect(detail.textContent).toContain("ability");
    expect(detail.textContent).not.toContain("abandon");
  });

  it("speaks the selected spelling and continues in story order", () => {
    const speak = vi.fn();
    const onContinue = vi.fn();
    const view = renderStoryView({ unit, words, estimatedMinutes: 3, onContinue, speak });
    (view.querySelectorAll<HTMLButtonElement>(".story-word")[2]).click();
    view.querySelector<HTMLButtonElement>(".story-speak")!.click();
    expect(speak).toHaveBeenCalledWith("abnormal");
    view.querySelector<HTMLButtonElement>(".story-continue")!.click();
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledWith(words.map((word) => word.id));
  });

  it("keeps hostile source text literal without creating an image", () => {
    const unsafeUnit = { ...unit, hook: '<img src="x" onerror="alert(1)">' };
    const view = renderStoryView({ unit: unsafeUnit, words, estimatedMinutes: 3, onContinue: vi.fn() });
    expect(view.querySelector("img")).toBeNull();
    expect(view.querySelector(".story-hook")?.textContent).toBe(unsafeUnit.hook);
  });
});
