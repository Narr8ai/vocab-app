import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "../../src/domain/profile";

describe("createEmptyProfile", () => {
  it("creates a blank versioned profile with append-only evidence collections", () => {
    const profile = createEmptyProfile("student-1", "Asia/Shanghai", "2026-09-09T08:00:00.000Z");

    expect(profile).toMatchObject({
      id: "student-1",
      timezone: "Asia/Shanghai",
      schemaVersion: 1,
      attempts: [],
      sessions: [],
      dailyCompletions: [],
    });
  });
});
