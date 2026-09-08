import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../../src/domain/types";

describe("application modules", () => {
  it("exposes schema version 1", () => expect(SCHEMA_VERSION).toBe(1));
});
