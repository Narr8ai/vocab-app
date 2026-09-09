import type { LearningProfile, ProfileMode } from "../domain/types";

export interface LoadProfileResult { profile: LearningProfile; warning?: string; }

export interface ProfileRepository {
  load(mode: ProfileMode): LoadProfileResult;
  save(profile: LearningProfile, mode?: ProfileMode): void;
  clearReal(): void;
  backupCorrupt(raw: string): void;
}
