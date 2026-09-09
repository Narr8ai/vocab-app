import type { ListId } from "./vocab";
import type { StoryUnit } from "../domain/story-learning";
import { L01_L09 } from "./story-units/L01-L09";
import { L10_L18 } from "./story-units/L10-L18";
import { L19_L26 } from "./story-units/L19-L26";

export const STORY_UNITS: readonly StoryUnit[] = [...L01_L09, ...L10_L18, ...L19_L26];

export function getStoryUnit(listId: ListId): StoryUnit {
  const unit = STORY_UNITS.find((candidate) => candidate.listId === listId);
  if (!unit) throw new Error(`Unknown story unit: ${listId}`);
  return unit;
}
