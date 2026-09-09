import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "../../src/domain/profile";
import { finishSession, pauseSession, resumeSession, startSession } from "../../src/domain/sessions";

describe("effective learning sessions", () => {
  it("counts only foreground intervals between start, pause, resume, and finish", () => {
    const empty = createEmptyProfile("student", "Asia/Shanghai", "2026-09-09T08:00:00.000Z");
    const started = startSession(empty, "s1", "task-1", "2026-09-09T08:00:00.000Z");
    const paused = pauseSession(started, "s1", "2026-09-09T08:01:30.000Z");
    const resumed = resumeSession(paused, "s1", "2026-09-09T08:10:00.000Z");
    const finished = finishSession(resumed, "s1", "2026-09-09T08:11:00.000Z");

    expect(finished.sessions[0]).toMatchObject({ activeSeconds: 150, endedAt: "2026-09-09T08:11:00.000Z" });
  });
});
