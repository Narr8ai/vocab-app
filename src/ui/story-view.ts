import { getStoryWordIds, type StoryUnit } from "../domain/story-learning";
import type { VocabWord } from "../data/vocab";

export interface StoryViewOptions {
  unit: StoryUnit;
  words: readonly VocabWord[];
  estimatedMinutes: number;
  onContinue: (wordIds: string[]) => void;
  speak?: (text: string) => void;
}

const addText = (parent: Node, text: string): void => {
  parent.appendChild(document.createTextNode(text));
};

export function renderStoryView(options: StoryViewOptions): HTMLElement {
  const { unit, words, estimatedMinutes, onContinue, speak } = options;
  const storyWordIds = getStoryWordIds(unit);
  const resolvedWords = storyWordIds.map((wordId) => {
    const word = words.find((candidate) => candidate.id === wordId);
    if (!word) throw new Error(`Unable to resolve story word: ${wordId}`);
    return word;
  });

  const card = document.createElement("article");
  card.className = "story-card";

  const progress = document.createElement("p");
  progress.className = "story-progress";
  addText(progress, `故事阅读 · 第 1/4 步 · 约 ${estimatedMinutes} 分钟`);
  card.append(progress);

  const title = document.createElement("h1");
  title.className = "story-title";
  title.textContent = unit.title;
  card.append(title);

  const hook = document.createElement("p");
  hook.className = "story-hook";
  hook.textContent = unit.hook;
  card.append(hook);

  const detail = document.createElement("aside");
  detail.className = "story-word-detail";
  detail.hidden = true;
  detail.setAttribute("aria-live", "polite");
  card.append(detail);

  let activeButton: HTMLButtonElement | null = null;
  const buttonsByWordId = new Map<string, HTMLButtonElement>();

  const showWord = (word: VocabWord): void => {
    if (activeButton) activeButton.setAttribute("aria-expanded", "false");
    const button = buttonsByWordId.get(word.id);
    if (button) {
      button.setAttribute("aria-expanded", "true");
      activeButton = button;
    }
    while (detail.firstChild) detail.removeChild(detail.firstChild);
    const spelling = document.createElement("strong");
    spelling.className = "story-detail-spelling";
    spelling.textContent = word.spelling;
    detail.append(spelling);
    const phonetic = document.createElement("span");
    phonetic.className = "story-detail-phonetic";
    phonetic.textContent = word.phonetic;
    detail.append(phonetic);
    const meaning = document.createElement("p");
    meaning.className = "story-detail-meaning";
    meaning.textContent = word.meaning;
    detail.append(meaning);
    const usage = document.createElement("p");
    usage.className = "story-detail-usage";
    usage.textContent = unit.usageNotes[word.id] ?? "";
    detail.append(usage);
    if (speak) {
      const speakButton = document.createElement("button");
      speakButton.type = "button";
      speakButton.className = "story-speak secondary";
      speakButton.textContent = "播放发音";
      speakButton.addEventListener("click", () => speak(word.spelling));
      detail.append(speakButton);
    }
    detail.hidden = false;
  };

  unit.paragraphs.forEach((paragraphData) => {
    const paragraph = document.createElement("p");
    paragraph.className = "story-paragraph";
    paragraph.dataset.paragraphId = paragraphData.id;
    paragraphData.segments.forEach((segment) => {
      if (segment.type === "text") {
        addText(paragraph, segment.text);
        return;
      }
      const word = resolvedWords.find((candidate) => candidate.id === segment.wordId);
      if (!word) throw new Error(`Unable to resolve story word: ${segment.wordId}`);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "story-word";
      button.textContent = word.spelling;
      button.setAttribute("aria-expanded", "false");
      button.addEventListener("click", () => showWord(word));
      buttonsByWordId.set(word.id, button);
      const entry = document.createElement("span");
      entry.className = "story-word-entry";
      const definition = document.createElement("span");
      definition.className = "story-word-definition";
      definition.textContent = `（${word.meaning}）`;
      entry.append(button, definition);
      paragraph.append(entry);
    });
    card.append(paragraph);
  });

  const continueButton = document.createElement("button");
  continueButton.type = "button";
  continueButton.className = "story-continue";
  continueButton.textContent = "进入情节回忆";
  continueButton.addEventListener("click", () => onContinue([...storyWordIds]));
  card.append(continueButton);

  return card;
}
