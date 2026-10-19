import type { ChatMessage } from "@/components/chat/MessageBubble";

export interface ChatSession {
  id: string;
  title: string;
  isGeneratingTitle?: boolean;
  hasCustomTitle?: boolean;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

const SESSIONS_STORAGE_KEY = "aarambh_chat_sessions_v2";
const ACTIVE_SESSION_STORAGE_KEY = "aarambh_active_session_id_v2";
const LEGACY_MESSAGES_KEY = "ai_agent_messages_v2";

export function loadAllChatSessions(): { sessions: ChatSession[]; activeSessionId: string } {
  if (typeof window === "undefined") {
    const defaultSession: ChatSession = {
      id: "session-default",
      title: "Untitled Chat",
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return { sessions: [defaultSession], activeSessionId: defaultSession.id };
  }

  try {
    const saved = localStorage.getItem(SESSIONS_STORAGE_KEY);
    let sessions: ChatSession[] = [];
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        sessions = parsed;
      }
    }

    // Migration from old single-chat storage if sessions don't exist yet
    if (sessions.length === 0) {
      const legacySaved = localStorage.getItem(LEGACY_MESSAGES_KEY);
      let legacyMessages: ChatMessage[] = [];
      if (legacySaved) {
        try {
          const parsedLegacy = JSON.parse(legacySaved);
          if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
            legacyMessages = parsedLegacy;
          }
        } catch {
          // ignore
        }
      }

      const initialSession: ChatSession = {
        id: `session-${Date.now()}`,
        title: legacyMessages.length > 0 ? "Chat 1" : "Untitled Chat",
        hasCustomTitle: legacyMessages.length > 0,
        messages: legacyMessages,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      sessions = [initialSession];
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, initialSession.id);
    }

    let activeId = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (!activeId || !sessions.some((s) => s.id === activeId)) {
      activeId = sessions[0].id;
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeId);
    }

    return { sessions, activeSessionId: activeId };
  } catch (err) {
    console.warn("Failed reading chat sessions:", err);
    const fallback: ChatSession = {
      id: `session-${Date.now()}`,
      title: "Untitled Chat",
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return { sessions: [fallback], activeSessionId: fallback.id };
  }
}

export function saveAllChatSessions(sessions: ChatSession[], activeSessionId?: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeSessionId);
    }
  } catch (err) {
    console.warn("Failed saving chat sessions:", err);
  }
}
