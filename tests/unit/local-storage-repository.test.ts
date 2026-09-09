import { describe, expect, it } from "vitest";
import { LocalStorageProfileRepository } from "../../src/infrastructure/local-storage-repository";
import { createEmptyProfile } from "../../src/domain/profile";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  keys() { return [...this.values.keys()]; }
}

describe("LocalStorageProfileRepository", () => {
  it("creates, saves, and reloads an empty real profile", () => {
    const storage = new MemoryStorage();
    const repo = new LocalStorageProfileRepository(storage, "Asia/Shanghai", () => "2026-09-09T08:00:00.000Z");

    const first = repo.load("real");
    expect(first.profile.attempts).toEqual([]);
    repo.save(createEmptyProfile("student-a", "Asia/Shanghai", "2026-09-09T08:00:00.000Z"));

    expect(repo.load("real").profile.id).toBe("student-a");
  });

  it("keeps real serialized data unchanged when loading demo", () => {
    const storage = new MemoryStorage();
    const repo = new LocalStorageProfileRepository(storage, "Asia/Shanghai", () => "2026-09-09T08:00:00.000Z");
    repo.save(createEmptyProfile("real-id", "Asia/Shanghai", "2026-09-09T08:00:00.000Z"));
    const realBeforeDemo = storage.getItem("vocab-app:profile:real:v1");

    repo.load("demo");

    expect(storage.getItem("vocab-app:profile:real:v1")).toBe(realBeforeDemo);
  });

  it("backs up malformed real data and returns a recoverable warning", () => {
    const storage = new MemoryStorage();
    storage.setItem("vocab-app:profile:real:v1", "{bad json");
    const repo = new LocalStorageProfileRepository(storage, "Asia/Shanghai", () => "2026-09-09T08:00:00.000Z");

    const result = repo.load("real");

    expect(result.warning).toBeTruthy();
    expect(result.profile.attempts).toEqual([]);
    expect(storage.keys()).toContain("vocab-app:profile:corrupt:2026-09-09T08:00:00.000Z");
  });

  it("clears only real data", () => {
    const storage = new MemoryStorage();
    const repo = new LocalStorageProfileRepository(storage, "Asia/Shanghai", () => "2026-09-09T08:00:00.000Z");
    repo.save(createEmptyProfile("real-id", "Asia/Shanghai", "2026-09-09T08:00:00.000Z"));
    repo.load("demo");

    repo.clearReal();

    expect(storage.getItem("vocab-app:profile:real:v1")).toBeNull();
    expect(storage.getItem("vocab-app:profile:demo:v1")).toBeTruthy();
  });
});
