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

class FailingStorage extends MemoryStorage {
  failKey?: string;

  override setItem(key: string, value: string) {
    if (key === this.failKey) throw new Error("storage write failed");
    super.setItem(key, value);
  }
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

  it("recovers when a persisted entity is malformed even if its top-level fields exist", () => {
    const storage = new MemoryStorage();
    storage.setItem("vocab-app:profile:real:v1", JSON.stringify({
      ...createEmptyProfile("student-a", "Asia/Shanghai", "2026-09-09T08:00:00.000Z"),
      tasks: [{ id: "task-1", listId: "L01", kind: "learn", estimatedMinutes: 5 }],
    }));
    const repo = new LocalStorageProfileRepository(storage, "Asia/Shanghai", () => "2026-09-09T08:00:00.000Z");

    const result = repo.load("real");

    expect(result.warning).toBeTruthy();
    expect(result.profile.tasks).toEqual([]);
  });

  it("rejects impossible task dates before they reach the scheduler", () => {
    const storage = new MemoryStorage();
    storage.setItem("vocab-app:profile:real:v1", JSON.stringify({
      ...createEmptyProfile("student-a", "Asia/Shanghai", "2026-09-09T08:00:00.000Z"),
      tasks: [{ id: "task-1", listId: "L01", dueDate: "2026-02-30", kind: "learn", estimatedMinutes: 5 }],
    }));
    const repo = new LocalStorageProfileRepository(storage, "Asia/Shanghai", () => "2026-09-09T08:00:00.000Z");

    expect(repo.load("real").warning).toBeTruthy();
  });

  it("preserves the active profile and cleans the temporary record when replacement fails", () => {
    const storage = new FailingStorage();
    const repo = new LocalStorageProfileRepository(storage, "Asia/Shanghai", () => "2026-09-09T08:00:00.000Z");
    repo.save(createEmptyProfile("before", "Asia/Shanghai", "2026-09-09T08:00:00.000Z"));
    storage.failKey = "vocab-app:profile:real:v1";

    expect(() => repo.save(createEmptyProfile("after", "Asia/Shanghai", "2026-09-09T08:00:00.000Z"))).toThrow("storage write failed");
    expect(repo.load("real").profile.id).toBe("before");
    expect(storage.getItem("vocab-app:profile:real:v1:tmp")).toBeNull();
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
