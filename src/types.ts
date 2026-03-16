// ---- Curriculum ----

export interface Domain {
  readonly id: number;
  readonly title: string;
  readonly weight: number;
  readonly taskStatements: readonly TaskStatement[];
}

export interface TaskStatement {
  readonly id: string;
  readonly domainId: number;
  readonly title: string;
  readonly description: string;
  readonly mentalModel: string;
}

export interface Curriculum {
  readonly domains: readonly Domain[];
}

// ---- Questions ----

export type Difficulty = 'easy' | 'medium' | 'hard';
export type AnswerOption = 'A' | 'B' | 'C' | 'D';

export interface Question {
  readonly id: string;
  readonly taskStatement: string;
  readonly domainId: number;
  readonly difficulty: Difficulty;
  readonly scenario: string;
  readonly text: string;
  readonly options: {
    readonly A: string;
    readonly B: string;
    readonly C: string;
    readonly D: string;
  };
  readonly correctAnswer: AnswerOption;
  readonly explanation: string;
  readonly whyWrongMap: {
    readonly A?: string;
    readonly B?: string;
    readonly C?: string;
    readonly D?: string;
  };
  readonly references: readonly string[];
}

export interface QuestionBank {
  readonly domainId: number;
  readonly questions: readonly Question[];
}

// ---- Grading ----

export interface GradeResult {
  readonly questionId: string;
  readonly isCorrect: boolean;
  readonly userAnswer: AnswerOption;
  readonly correctAnswer: AnswerOption;
  readonly explanation: string;
  readonly whyUserWasWrong: string | null;
  readonly references: readonly string[];
}

// ---- User & Progress ----

export type MasteryLevel = 'unassessed' | 'weak' | 'developing' | 'strong' | 'mastered';
export type LearningPath = 'beginner-friendly' | 'exam-weighted' | 'custom';
export type StudyMode = 'assessment' | 'guided' | 'quiz' | 'review' | 'project';

export interface User {
  readonly id: string;
  readonly displayName: string | null;
  readonly createdAt: string;
  readonly lastActivityAt: string | null;
  readonly assessmentCompleted: boolean;
  readonly learningPath: LearningPath | null;
}

export interface DomainMastery {
  readonly userId: string;
  readonly taskStatement: string;
  readonly domainId: number;
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly accuracyPercent: number;
  readonly masteryLevel: MasteryLevel;
  readonly lastTestedAt: string | null;
}

export interface ReviewScheduleEntry {
  readonly userId: string;
  readonly taskStatement: string;
  readonly nextReviewAt: string;
  readonly interval: number;
  readonly easeFactor: number;
  readonly consecutiveCorrect: number;
}

export interface AnswerRecord {
  readonly id: number;
  readonly userId: string;
  readonly questionId: string;
  readonly taskStatement: string;
  readonly domainId: number;
  readonly userAnswer: string;
  readonly correctAnswer: string;
  readonly isCorrect: boolean;
  readonly difficulty: Difficulty;
  readonly answeredAt: string;
}

// ---- Session State ----

export interface SessionState {
  readonly userId: string;
  readonly currentMode: StudyMode;
  readonly currentDomain: number | null;
  readonly currentTaskStatement: string | null;
  readonly currentQuestionIndex: number;
  readonly positionStack: readonly StackFrame[];
  readonly reviewQueueIds: readonly string[];
}

export interface StackFrame {
  readonly mode: StudyMode;
  readonly domain: number;
  readonly taskStatement: string;
  readonly questionIndex: number;
}

// ---- Spaced Repetition ----

export interface SM2Result {
  readonly interval: number;
  readonly easeFactor: number;
  readonly consecutiveCorrect: number;
  readonly nextReviewAt: string;
}

// ---- Practice Exam ----

export interface ExamAttempt {
  readonly id: number;
  readonly userId: string;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly totalQuestions: number;
  readonly correctAnswers: number;
  readonly score: number;
  readonly passed: boolean;
  readonly questionIds: readonly string[];
  readonly answeredQuestionIds: readonly string[];
  readonly domainScores: Readonly<Record<string, DomainExamScore>>;
}

export interface DomainExamScore {
  readonly domainId: number;
  readonly domainTitle: string;
  readonly totalQuestions: number;
  readonly correctAnswers: number;
  readonly accuracyPercent: number;
  readonly weight: number;
}

// ---- Follow-Up ----

export interface FollowUpOption {
  readonly key: string;
  readonly label: string;
}

// ---- Capstone Build ----

export type CapstoneBuildStatus = 'shaping' | 'building' | 'completed' | 'abandoned';

export interface CapstoneBuild {
  readonly id: string;
  readonly userId: string;
  readonly theme: string;
  readonly currentStep: number;
  readonly status: CapstoneBuildStatus;
  readonly themeValidated: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CapstoneBuildStep {
  readonly id: string;
  readonly buildId: string;
  readonly stepIndex: number;
  readonly fileName: string;
  readonly taskStatements: string;
  readonly quizQuestionIds: string | null;
  readonly quizCompleted: number;
  readonly buildCompleted: number;
  readonly walkthroughViewed: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BuildStepTemplate {
  readonly stepIndex: number;
  readonly fileName: string;
  readonly taskStatements: readonly string[];
}

export interface BuildStepUpdates {
  readonly quizCompleted: number;
  readonly buildCompleted: number;
  readonly walkthroughViewed: number;
}

// ---- Config ----

export interface UserConfig {
  readonly userId: string;
  readonly displayName: string | null;
  readonly createdAt: string;
}
