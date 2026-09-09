import type { ProfileMode } from "../domain/types";
import type { ProfileRepository } from "../infrastructure/profile-repository";

export class AppService {
  constructor(private readonly profiles: ProfileRepository) {}
  loadProfile(mode: ProfileMode) { return this.profiles.load(mode); }
}
