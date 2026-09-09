import { describe, expect, it } from "vitest";
import { calendarDate } from "../../src/domain/calendar";

describe("learning calendar", () => {
  it("uses the learner timezone instead of the UTC date around midnight", () => {
    expect(calendarDate("2026-09-08T16:30:00.000Z", "Asia/Shanghai")).toBe("2026-09-09");
  });
});
