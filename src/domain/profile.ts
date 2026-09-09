import { SCHEMA_VERSION, type LearningProfile } from "./types";

export function createEmptyProfile(profileId: string, timezone: string, now: string): LearningProfile {
  return {
    id: profileId,
    schemaVersion: SCHEMA_VERSION,
    timezone,
    createdAt: now,
    plans: [], tasks: [], listStates: [], wordStates: [], attempts: [], sessions: [], dailyCompletions: [],
  };
}
