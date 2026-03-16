export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  displayName TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  lastActivityAt DATETIME,
  assessmentCompleted BOOLEAN DEFAULT FALSE,
  learningPath TEXT
);

CREATE TABLE IF NOT EXISTS domain_mastery (
  userId TEXT NOT NULL,
  taskStatement TEXT NOT NULL,
  domainId INTEGER NOT NULL,
  totalAttempts INTEGER DEFAULT 0,
  correctAttempts INTEGER DEFAULT 0,
  accuracyPercent REAL DEFAULT 0,
  masteryLevel TEXT DEFAULT 'unassessed',
  lastTestedAt DATETIME,
  FOREIGN KEY (userId) REFERENCES users(id),
  PRIMARY KEY (userId, taskStatement)
);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  questionId TEXT NOT NULL,
  taskStatement TEXT NOT NULL,
  domainId INTEGER NOT NULL,
  userAnswer TEXT NOT NULL,
  correctAnswer TEXT NOT NULL,
  isCorrect BOOLEAN NOT NULL,
  difficulty TEXT NOT NULL,
  answeredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS review_schedule (
  userId TEXT NOT NULL,
  taskStatement TEXT NOT NULL,
  nextReviewAt DATETIME NOT NULL,
  interval INTEGER DEFAULT 1,
  easeFactor REAL DEFAULT 2.5,
  consecutiveCorrect INTEGER DEFAULT 0,
  FOREIGN KEY (userId) REFERENCES users(id),
  PRIMARY KEY (userId, taskStatement)
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  startedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  endedAt DATETIME,
  domainId INTEGER,
  questionsAnswered INTEGER DEFAULT 0,
  correctAnswers INTEGER DEFAULT 0,
  mode TEXT,
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS handout_views (
  userId TEXT NOT NULL,
  taskStatement TEXT NOT NULL,
  viewedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  timeSpentSeconds INTEGER DEFAULT 0,
  PRIMARY KEY (userId, taskStatement),
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS session_state (
  userId TEXT PRIMARY KEY,
  currentMode TEXT NOT NULL,
  currentDomain INTEGER,
  currentTaskStatement TEXT,
  currentQuestionIndex INTEGER DEFAULT 0,
  positionStack TEXT DEFAULT '[]',
  reviewQueueIds TEXT DEFAULT '[]',
  lastUpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  startedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  completedAt DATETIME,
  totalQuestions INTEGER NOT NULL DEFAULT 60,
  correctAnswers INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  passed BOOLEAN DEFAULT FALSE,
  questionIds TEXT NOT NULL DEFAULT '[]',
  answeredQuestionIds TEXT NOT NULL DEFAULT '[]',
  domainScores TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS capstone_builds (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  theme TEXT NOT NULL,
  currentStep INTEGER DEFAULT 0,
  status TEXT DEFAULT 'shaping',
  themeValidated INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS capstone_build_steps (
  id TEXT PRIMARY KEY,
  buildId TEXT NOT NULL,
  stepIndex INTEGER NOT NULL,
  fileName TEXT NOT NULL,
  taskStatements TEXT NOT NULL,
  quizQuestionIds TEXT,
  quizCompleted INTEGER DEFAULT 0,
  buildCompleted INTEGER DEFAULT 0,
  walkthroughViewed INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (buildId) REFERENCES capstone_builds(id)
);
`;
