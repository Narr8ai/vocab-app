import type { ActiveLearning, LearningProfile } from "./types";

export function saveActiveLearning(profile: LearningProfile, activeLearning: ActiveLearning): LearningProfile {
  return { ...profile, activeLearning: { ...activeLearning, wordIds: [...activeLearning.wordIds], meaningResults: activeLearning.meaningResults?.map((result) => ({ ...result })) } };
}

export function clearActiveLearning(profile: LearningProfile, taskId: string): LearningProfile {
  if (profile.activeLearning?.taskId !== taskId) return profile;
  const { activeLearning: _activeLearning, ...withoutActiveLearning } = profile;
  return withoutActiveLearning;
}
