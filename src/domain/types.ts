/** Current persisted profile schema. Increment only with a migration. */
export const SCHEMA_VERSION = 1 as const;

export type SchemaVersion = typeof SCHEMA_VERSION;

export type ProfileMode = "real" | "demo";

export interface StudyPlan { id: string; name: string; listIds: string[]; createdAt: string; }
export interface LearningTask { id: string; listId: string; dueDate: string; kind: string; estimatedMinutes: number; sourceTaskId?: string; completedAt?: string; }
export interface ListState { listId: string; completedWordIds: string[]; }
export interface WordState { wordId: string; meaningCorrect: number; spellingCorrect: number; }
export interface AttemptResult { wordId: string; correct: boolean; }
export interface Attempt { id: string; taskId: string; listId: string; kind: string; reviewOccurrenceId: string; results: AttemptResult[]; occurredAt: string; }
export interface StudySession { id: string; taskId: string; startedAt: string; lastActiveAt?: string; endedAt?: string; activeSeconds: number; }
export interface DailyCompletion { date: string; taskIds: string[]; completedAt: string; }
export type LearningStep = "study" | "recall" | "meaning" | "spelling";
export interface ActiveLearning { taskId: string; listId: string; step: LearningStep; wordIds: string[]; meaningResults?: AttemptResult[]; }

export interface LearningProfile {
  id: string;
  schemaVersion: SchemaVersion;
  timezone: string;
  createdAt: string;
  plans: StudyPlan[];
  tasks: LearningTask[];
  listStates: ListState[];
  wordStates: WordState[];
  attempts: Attempt[];
  sessions: StudySession[];
  dailyCompletions: DailyCompletion[];
  activeLearning?: ActiveLearning;
}
