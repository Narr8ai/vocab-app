import type { LearningProfile } from "./types";

function elapsedSeconds(from: string, to: string): number {
  return Math.max(0, Math.floor((Date.parse(to) - Date.parse(from)) / 1000));
}

export function startSession(profile: LearningProfile, sessionId: string, taskId: string, timestamp: string): LearningProfile {
  const existing = profile.sessions.find((session) => session.taskId === taskId && !session.endedAt);
  if (existing) return resumeSession(profile, existing.id, timestamp);
  return { ...profile, sessions: [...profile.sessions, { id: sessionId, taskId, startedAt: timestamp, lastActiveAt: timestamp, activeSeconds: 0 }] };
}

export function pauseSession(profile: LearningProfile, sessionId: string, timestamp: string): LearningProfile {
  return { ...profile, sessions: profile.sessions.map((session) => session.id === sessionId && session.lastActiveAt
    ? { ...session, activeSeconds: session.activeSeconds + elapsedSeconds(session.lastActiveAt, timestamp), lastActiveAt: undefined }
    : session) };
}

export function resumeSession(profile: LearningProfile, sessionId: string, timestamp: string): LearningProfile {
  return { ...profile, sessions: profile.sessions.map((session) => session.id === sessionId && !session.endedAt
    ? { ...session, lastActiveAt: timestamp }
    : session) };
}

export function finishSession(profile: LearningProfile, sessionId: string, timestamp: string): LearningProfile {
  const paused = pauseSession(profile, sessionId, timestamp);
  return { ...paused, sessions: paused.sessions.map((session) => session.id === sessionId ? { ...session, endedAt: timestamp } : session) };
}
