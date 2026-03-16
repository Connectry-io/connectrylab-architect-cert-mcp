/**
 * Session Management — Resume, Fork, and Named Sessions
 *
 * Task Statements Covered:
 *   1.7: Manage session state, resumption, and forking
 *
 * What This Teaches:
 *   - Named sessions that persist conversation state
 *   - Session resumption (pick up where you left off)
 *   - Session forking (branch from a point in an existing session)
 *   - Immutable session state — every update creates a new session object
 *
 * Key Concepts:
 *   In the Claude Agent SDK, sessions are managed via the Task tool's
 *   session_id parameter. Named sessions let you resume work across
 *   multiple invocations. Forking creates a new session that inherits
 *   state up to a specific point — useful for exploring alternative
 *   approaches without losing the original path.
 *
 *   This module implements session management as a pure in-memory store
 *   to demonstrate the patterns. In production, you'd persist to SQLite
 *   or a similar store (as the Connectry MCP server does).
 */

import type {
  Session,
  SessionCreateOptions,
  SessionForkOptions,
  ConversationMessage,
  WorkflowState,
} from "./types.js";

// ---------------------------------------------------------------------------
// Session Store — Immutable In-Memory Store
// ---------------------------------------------------------------------------

/**
 * The session store is an immutable Map. Every mutation operation returns
 * a new store rather than modifying the existing one. This makes it easy
 * to implement undo, time-travel debugging, and safe concurrency.
 */
export type SessionStore = ReadonlyMap<string, Session>;

/**
 * Creates an empty session store.
 */
export function createSessionStore(): SessionStore {
  return new Map();
}

// ---------------------------------------------------------------------------
// Session CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Generates a unique session ID. In production, use crypto.randomUUID().
 * Here we use a simple timestamp + random suffix for clarity.
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `session-${timestamp}-${random}`;
}

/**
 * Creates an initial workflow state for a new session.
 * Every session starts at the "decomposition" stage.
 */
function createInitialWorkflowState(): WorkflowState {
  return {
    currentStage: "decomposition",
    completedStages: [],
    stageData: {},
    errors: [],
  };
}

/**
 * Creates a new session and adds it to the store.
 * Returns a tuple of [newStore, createdSession] — the original store
 * is not modified.
 *
 * KEY CONCEPT (1.7): Named sessions let you reference a session by name
 * rather than by ID. This is how "resume my research on X" works — the
 * system looks up the session by name.
 */
export function createSession(
  store: SessionStore,
  options: SessionCreateOptions
): readonly [SessionStore, Session] {
  const now = new Date().toISOString();
  const session: Session = {
    id: generateSessionId(),
    name: options.name,
    parentId: null,
    forkPoint: null,
    createdAt: now,
    updatedAt: now,
    status: "active",
    messages: [],
    workflowState: createInitialWorkflowState(),
    metadata: options.metadata ?? {},
  };

  const newStore = new Map(store);
  newStore.set(session.id, session);

  return [newStore, session] as const;
}

/**
 * Retrieves a session by ID. Returns undefined if not found.
 */
export function getSession(
  store: SessionStore,
  sessionId: string
): Session | undefined {
  return store.get(sessionId);
}

/**
 * Finds a session by name. Returns the most recently updated session
 * matching the name, or undefined if no match.
 */
export function findSessionByName(
  store: SessionStore,
  name: string
): Session | undefined {
  const matches = Array.from(store.values())
    .filter((s) => s.name === name)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  return matches[0];
}

/**
 * Lists all sessions, optionally filtered by status.
 * Returns a new array — the store is never exposed directly.
 */
export function listSessions(
  store: SessionStore,
  statusFilter?: Session["status"]
): readonly Session[] {
  const all = Array.from(store.values());
  if (statusFilter === undefined) {
    return all;
  }
  return all.filter((s) => s.status === statusFilter);
}

// ---------------------------------------------------------------------------
// Session Updates — Immutable State Transitions
// ---------------------------------------------------------------------------

/**
 * Adds a message to a session's conversation history.
 * Returns a new store with the updated session — original is not modified.
 *
 * KEY CONCEPT (1.7): Messages accumulate in the session. When you resume
 * a session, the full message history is available as context for the
 * next API call. This is how the model "remembers" what happened before.
 */
export function addMessage(
  store: SessionStore,
  sessionId: string,
  message: ConversationMessage
): SessionStore {
  const session = store.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  if (session.status !== "active") {
    throw new Error(
      `Cannot add messages to ${session.status} session: ${sessionId}`
    );
  }

  const updatedSession: Session = {
    ...session,
    messages: [...session.messages, message],
    updatedAt: new Date().toISOString(),
  };

  const newStore = new Map(store);
  newStore.set(sessionId, updatedSession);
  return newStore;
}

/**
 * Updates the workflow state of a session.
 * Returns a new store — original is not modified.
 */
export function updateWorkflowState(
  store: SessionStore,
  sessionId: string,
  workflowState: WorkflowState
): SessionStore {
  const session = store.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const updatedSession: Session = {
    ...session,
    workflowState,
    updatedAt: new Date().toISOString(),
  };

  const newStore = new Map(store);
  newStore.set(sessionId, updatedSession);
  return newStore;
}

/**
 * Pauses an active session. Paused sessions can be resumed later.
 * Returns a new store — original is not modified.
 */
export function pauseSession(
  store: SessionStore,
  sessionId: string
): SessionStore {
  const session = store.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  if (session.status !== "active") {
    throw new Error(`Can only pause active sessions, got: ${session.status}`);
  }

  const updatedSession: Session = {
    ...session,
    status: "paused",
    updatedAt: new Date().toISOString(),
  };

  const newStore = new Map(store);
  newStore.set(sessionId, updatedSession);
  return newStore;
}

/**
 * Resumes a paused session. The session becomes active again and
 * its full message history is available for the next API call.
 *
 * KEY CONCEPT (1.7): Resumption is the simplest form of session
 * persistence. The messages array IS the context — pass it directly
 * to the Messages API and the model picks up where it left off.
 */
export function resumeSession(
  store: SessionStore,
  sessionId: string
): SessionStore {
  const session = store.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  if (session.status !== "paused") {
    throw new Error(`Can only resume paused sessions, got: ${session.status}`);
  }

  const updatedSession: Session = {
    ...session,
    status: "active",
    updatedAt: new Date().toISOString(),
  };

  const newStore = new Map(store);
  newStore.set(sessionId, updatedSession);
  return newStore;
}

/**
 * Marks a session as completed. Completed sessions are read-only.
 */
export function completeSession(
  store: SessionStore,
  sessionId: string
): SessionStore {
  const session = store.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const updatedSession: Session = {
    ...session,
    status: "completed",
    updatedAt: new Date().toISOString(),
  };

  const newStore = new Map(store);
  newStore.set(sessionId, updatedSession);
  return newStore;
}

// ---------------------------------------------------------------------------
// Session Forking — Branching Exploration
// ---------------------------------------------------------------------------

/**
 * Forks a session at a specific point in its message history.
 * The new session inherits messages up to the fork point (or all messages
 * if no fork point is specified). The original session is marked as "forked".
 *
 * KEY CONCEPT (1.7): Forking is powerful for exploring alternative
 * approaches. Imagine a research session where the coordinator took
 * one path — fork the session to try a different decomposition strategy
 * while preserving the original results.
 *
 * In the Claude Agent SDK, this maps to creating a new Task with a
 * different session_id but seeding it with messages from an existing session.
 *
 * Returns a tuple of [newStore, forkedSession].
 */
export function forkSession(
  store: SessionStore,
  options: SessionForkOptions
): readonly [SessionStore, Session] {
  const sourceSession = store.get(options.sourceSessionId);
  if (!sourceSession) {
    throw new Error(`Source session not found: ${options.sourceSessionId}`);
  }

  // Determine how many messages to carry over
  const forkPoint =
    options.forkAtMessage ?? sourceSession.messages.length;
  const inheritedMessages = sourceSession.messages.slice(0, forkPoint);

  const now = new Date().toISOString();

  // Create the forked session with inherited state
  const forkedSession: Session = {
    id: generateSessionId(),
    name: options.newName,
    parentId: sourceSession.id,
    forkPoint,
    createdAt: now,
    updatedAt: now,
    status: "active",
    messages: inheritedMessages,
    workflowState: { ...sourceSession.workflowState },
    metadata: {
      ...sourceSession.metadata,
      ...options.metadata,
      forkedFrom: sourceSession.id,
      forkedAt: now,
    },
  };

  // Mark the source session as forked
  const updatedSource: Session = {
    ...sourceSession,
    status: "forked",
    updatedAt: now,
    metadata: {
      ...sourceSession.metadata,
      forkedTo: forkedSession.id,
    },
  };

  const newStore = new Map(store);
  newStore.set(sourceSession.id, updatedSource);
  newStore.set(forkedSession.id, forkedSession);

  return [newStore, forkedSession] as const;
}

// ---------------------------------------------------------------------------
// Session History — Querying the Fork Tree
// ---------------------------------------------------------------------------

/**
 * Gets the full ancestry chain for a session (from root to current).
 * Useful for understanding how a research path evolved through forks.
 */
export function getSessionAncestry(
  store: SessionStore,
  sessionId: string
): readonly Session[] {
  const ancestry: Session[] = [];
  let currentId: string | null = sessionId;

  while (currentId !== null) {
    const session = store.get(currentId);
    if (!session) break;
    ancestry.unshift(session);
    currentId = session.parentId;
  }

  return ancestry;
}

/**
 * Gets all sessions that were forked from a given session.
 * Returns direct children only (not grandchildren).
 */
export function getSessionForks(
  store: SessionStore,
  sessionId: string
): readonly Session[] {
  return Array.from(store.values()).filter(
    (s) => s.parentId === sessionId
  );
}

// ---------------------------------------------------------------------------
// Session Summary — For Coordinator Context Passing
// ---------------------------------------------------------------------------

/**
 * Creates a compact summary of a session suitable for passing as context
 * to a subagent. Includes the session name, status, message count, and
 * current workflow stage — but NOT the full message history (which could
 * exceed context limits).
 *
 * KEY CONCEPT (1.3): When spawning subagents, you provide explicit context
 * rather than sharing the full session. This summary is what gets passed.
 */
export function createSessionSummary(session: Session): string {
  const messageCount = session.messages.length;
  const lastMessage =
    messageCount > 0
      ? session.messages[messageCount - 1]
      : null;

  return [
    `Session: ${session.name} (${session.id})`,
    `Status: ${session.status}`,
    `Stage: ${session.workflowState.currentStage}`,
    `Messages: ${messageCount}`,
    `Completed Stages: ${session.workflowState.completedStages.join(", ") || "none"}`,
    `Errors: ${session.workflowState.errors.length}`,
    lastMessage
      ? `Last message role: ${lastMessage.role}`
      : "No messages yet",
    session.parentId
      ? `Forked from: ${session.parentId} at message ${session.forkPoint}`
      : "Root session",
  ].join("\n");
}
