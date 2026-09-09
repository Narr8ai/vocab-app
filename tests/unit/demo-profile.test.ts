import { describe, expect, it } from "vitest";
import { loadDemoProfile } from "../../src/data/demo-profile";

describe("demo profile", () => {
  it("contains readable sample evidence without sharing a real profile id", () => {
    const demo = loadDemoProfile();
    expect(demo.id).toBe("demo-profile");
    expect(demo.attempts.length).toBeGreaterThan(0);
    expect(demo.plans.length).toBeGreaterThan(0);
  });
});
