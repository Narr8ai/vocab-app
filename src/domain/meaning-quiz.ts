import { getList, type ListId } from "../data/vocab";

export function meaningChoices(listId: ListId, wordId: string): string[] {
  const words = getList(listId).words;
  const targetIndex = words.findIndex((word) => word.id === wordId);
  if (targetIndex < 0) throw new Error("Unknown vocabulary word.");
  const target = words[targetIndex].meaning;
  const distractors = words.filter((word) => word.id !== wordId).slice(0, 3).map((word) => word.meaning);
  const choices = [target, ...distractors];
  const offset = targetIndex % choices.length;
  return [...choices.slice(offset), ...choices.slice(0, offset)];
}
