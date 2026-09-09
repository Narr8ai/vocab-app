import type { ProfileMode } from "../domain/types";
import { createPlan, type PlanInput, type SchedulerDeps } from "../domain/scheduler";
import type { ProfileRepository } from "../infrastructure/profile-repository";

export class AppService {
  constructor(private readonly profiles: ProfileRepository) {}
  loadProfile(mode: ProfileMode) { return this.profiles.load(mode); }
  createPlan(input: PlanInput, mode: ProfileMode, deps: SchedulerDeps) {
    const profile = createPlan(input, this.profiles.load(mode).profile, deps);
    this.profiles.save(profile, mode);
    return profile;
  }
}
