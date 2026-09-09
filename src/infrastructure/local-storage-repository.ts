import { createEmptyProfile } from "../domain/profile";
import { SCHEMA_VERSION, type LearningProfile, type ProfileMode } from "../domain/types";
import type { LoadProfileResult, ProfileRepository } from "./profile-repository";

export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void; }

const keyFor = (mode: ProfileMode) => `vocab-app:profile:${mode}:v1`;

function isProfile(value: unknown): value is LearningProfile {
  if (typeof value !== "object" || value === null) return false;
  const profile = value as Partial<LearningProfile>;
  return profile.schemaVersion === SCHEMA_VERSION && typeof profile.id === "string" && typeof profile.timezone === "string"
    && Array.isArray(profile.plans) && Array.isArray(profile.tasks) && Array.isArray(profile.listStates)
    && Array.isArray(profile.wordStates) && Array.isArray(profile.attempts) && Array.isArray(profile.sessions)
    && Array.isArray(profile.dailyCompletions);
}

export class LocalStorageProfileRepository implements ProfileRepository {
  constructor(private readonly storage: StorageLike, private readonly timezone: string, private readonly now: () => string) {}

  load(mode: ProfileMode): LoadProfileResult {
    const raw = this.storage.getItem(keyFor(mode));
    if (raw === null) {
      const profile = createEmptyProfile(`${mode}-profile`, this.timezone, this.now());
      this.save(profile, mode);
      return { profile };
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isProfile(parsed)) return { profile: parsed };
    } catch { /* recover below */ }
    this.backupCorrupt(raw);
    this.storage.removeItem(keyFor(mode));
    return { profile: createEmptyProfile(`${mode}-profile`, this.timezone, this.now()), warning: "Saved learning data was recovered." };
  }

  save(profile: LearningProfile, mode: ProfileMode = "real"): void {
    const activeKey = keyFor(mode);
    const temporaryKey = `${activeKey}:tmp`;
    const serialized = JSON.stringify(profile);
    this.storage.setItem(temporaryKey, serialized);
    if (this.storage.getItem(temporaryKey) !== serialized) throw new Error("Learning profile could not be saved.");
    this.storage.setItem(activeKey, serialized);
    this.storage.removeItem(temporaryKey);
  }

  clearReal(): void { this.storage.removeItem(keyFor("real")); }

  backupCorrupt(raw: string): void {
    this.storage.setItem(`vocab-app:profile:corrupt:${this.now()}`, raw);
  }
}
