import { getList, type ListId } from "../data/vocab";

export type StorySegment = { type: "text"; text: string } | { type: "word"; wordId: string };

export interface StoryParagraph {
  id: string;
  segments: readonly StorySegment[];
}

export interface StoryRecallPrompt {
  wordId: string;
  cue: string;
}

export interface StoryUnit {
  listId: ListId;
  title: string;
  hook: string;
  paragraphs: readonly StoryParagraph[];
  usageNotes: Readonly<Record<string, string>>;
  recallPrompts: readonly StoryRecallPrompt[];
}

export function getStoryWordIds(unit: StoryUnit): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const paragraph of unit.paragraphs) {
    for (const segment of paragraph.segments) {
      if (segment.type === "word" && !seen.has(segment.wordId)) {
        seen.add(segment.wordId);
        ids.push(segment.wordId);
      }
    }
  }

  return ids;
}

export function validateStoryUnit(unit: StoryUnit): string[] {
  const errors: string[] = [];
  let vocabularyIds = new Set<string>();

  try {
    vocabularyIds = new Set(getList(unit.listId).words.map((word) => word.id));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : `Unknown vocabulary list: ${unit.listId}`);
  }

  const paragraphIds = getStoryWordIds(unit);
  const paragraphIdSet = new Set(paragraphIds);
  const usageIds = Object.keys(unit.usageNotes);
  const promptIds = unit.recallPrompts.map((prompt) => prompt.wordId);
  const promptCounts = new Map<string, number>();

  for (const wordId of paragraphIds) {
    if (!vocabularyIds.has(wordId)) errors.push(`Word ${wordId} is not in list ${unit.listId}.`);
  }
  for (const wordId of usageIds) {
    if (!vocabularyIds.has(wordId)) errors.push(`Usage note ${wordId} is not in list ${unit.listId}.`);
    if (!paragraphIdSet.has(wordId)) errors.push(`Usage note is missing a paragraph word for ${wordId}.`);
  }
  for (const wordId of promptIds) {
    promptCounts.set(wordId, (promptCounts.get(wordId) ?? 0) + 1);
    if (!vocabularyIds.has(wordId)) errors.push(`Recall prompt ${wordId} is not in list ${unit.listId}.`);
    if (!paragraphIdSet.has(wordId)) errors.push(`Recall prompt is missing a paragraph word for ${wordId}.`);
  }

  for (const wordId of paragraphIds) {
    if (!(wordId in unit.usageNotes)) errors.push(`Missing usage note for ${wordId}.`);
    const promptCount = promptCounts.get(wordId) ?? 0;
    if (promptCount === 0) errors.push(`Missing recall prompt for ${wordId}.`);
    if (promptCount > 1) errors.push(`Duplicate recall prompt for ${wordId}.`);
  }

  return errors;
}

export function storyRecallChoices(unit: StoryUnit, wordId: string): string[] {
  const choices = [wordId, ...getStoryWordIds(unit).filter((candidate) => candidate !== wordId)];
  return choices.filter((candidate, index) => choices.indexOf(candidate) === index).slice(0, 3);
}
