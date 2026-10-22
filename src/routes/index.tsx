import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Loader2,
  SendHorizontal,
  Settings,
  Pencil,
  X,
  AlertTriangle,
  ArrowDown,
  Square,
  Plus,
  PanelLeft,
  ChevronDown,
  Sparkles,
  Check,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { sendChatMessage, generateChatTitle } from "@/lib/ai.functions";
import { MessageBubble, TypingBubble, type ChatMessage } from "@/components/chat/MessageBubble";
import { ChatSkeletonLoader } from "@/components/chat/ChatSkeletonLoader";
import { ProfileView } from "@/components/chat/ProfileView";
import { ChatSidebarDrawer } from "@/components/chat/ChatSidebarDrawer";
import { GeminiStar } from "@/components/chat/GeminiStar";
import { loadAllChatSessions, saveAllChatSessions, type ChatSession } from "@/lib/chatSessions";
import { Button } from "@/components/ui/button";
import { LEOMA_IDENTITY, DEFAULT_SYSTEM_PROMPT, AGENT_MODELS } from "@/lib/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aarambh AI — Smart AI Companion" },
      {
        name: "description",
        content:
          "A stylish, intelligent AI companion with local storage and deep reasoning capabilities.",
      },
      { property: "og:title", content: "Aarambh AI" },
      {
        property: "og:description",
        content:
          "A private, intelligent AI chat agent with local storage and deep reasoning capabilities.",
      },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const navigate = useNavigate();
  const { session, loading, profile } = useAuth();

  // Multi-Chat Sessions State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const activeSessionIdRef = useRef<string>("");
  activeSessionIdRef.current = activeSessionId;

  const sessionsRef = useRef<ChatSession[]>([]);
  sessionsRef.current = sessions;

  // Active session and its messages
  const currentSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0];
  }, [sessions, activeSessionId]);

  const messages = useMemo(() => {
    return currentSession?.messages || [];
  }, [currentSession]);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [isStreamingActive, setIsStreamingActive] = useState(false);

  // Edit Message states
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [originalEditInput, setOriginalEditInput] = useState("");

  // AI Chat Clear Overlay & Confirmation State
  const [isClearingChat, setIsClearingChat] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Abort controller and stream reference
  const isAbortedRef = useRef(false);
  const activeStreamMessageIdRef = useRef<string | null>(null);

  // Helper to persist messages into the active session
  const updateCurrentSessionMessages = useCallback(
    (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setSessions((prev) => {
        const activeId = activeSessionIdRef.current;
        const next = prev.map((s) => {
          if (s.id === activeId) {
            const nextMsgs = updater(s.messages);
            return {
              ...s,
              messages: nextMsgs,
              updated_at: new Date().toISOString(),
            };
          }
          return s;
        });
        saveAllChatSessions(next, activeId);
        return next;
      });
    },
    [],
  );

  // Execute chat memory clearing with smooth animation for current session
  const executeClearChat = () => {
    setIsClearingChat(true);
    setTimeout(() => {
      updateCurrentSessionMessages(() => []);
      setIsClearingChat(false);
      toast.success("Chat history cleared successfully!");
    }, 1200);
  };

  // View state: chat or profile/settings tab
  const [viewMode, setViewMode] = useState<"chat" | "profile">("chat");
  const [showModelMenu, setShowModelMenu] = useState(false);

  // Active Model based on user profile or default
  const activeModel = useMemo(() => {
    return (
      AGENT_MODELS.find((m) => m.id === profile?.selected_model) ||
      AGENT_MODELS.find((m) => m.isDefault) ||
      AGENT_MODELS[0]
    );
  }, [profile?.selected_model]);

  const handleSwitchModel = async (modelId: string) => {
    setShowModelMenu(false);
    try {
      await updateProfile({ selected_model: modelId });
      const target = AGENT_MODELS.find((m) => m.id === modelId);
      toast.success(`Active model: ${target?.name || modelId}`);
    } catch {
      // ignore
    }
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isUserScrolledUpRef = useRef(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [unreadDuringScroll, setUnreadDuringScroll] = useState(false);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  // Load chat sessions from localStorage
  const loadLocalSessions = useCallback(() => {
    setLoadingMessages(true);
    const { sessions: loadedSessions, activeSessionId: loadedActiveId } = loadAllChatSessions();
    setSessions(loadedSessions);
    setActiveSessionId(loadedActiveId);
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    if (session) {
      loadLocalSessions();
    }
  }, [session, loadLocalSessions]);

  // Create a new chat session
  const handleCreateNewChat = () => {
    if (isStreamingActive) {
      toast.info("Please wait for generation to complete");
      return;
    }
    isUserScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
    setUnreadDuringScroll(false);

    // Prevent creating multiple empty chats if current active chat is already empty!
    const currentSession = sessions.find((s) => s.id === activeSessionId);
    if (currentSession && currentSession.messages.length === 0) {
      inputRef.current?.focus();
      toast.info("New chat is already ready!");
      return;
    }

    // Keep non-empty sessions + current session
    const cleanedSessions = sessions.filter(
      (s) => s.messages.length > 0 || s.id === activeSessionId,
    );

    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: "Untitled Chat",
      hasCustomTitle: false,
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const nextSessions = [newSession, ...cleanedSessions];
    setSessions(nextSessions);
    setActiveSessionId(newSession.id);
    saveAllChatSessions(nextSessions, newSession.id);
    setInput("");
    setEditingMessageId(null);
    inputRef.current?.focus();
    toast.success("New chat created");
  };

  // Select an existing chat session
  const handleSelectSession = (sessionId: string) => {
    if (isStreamingActive) {
      toast.info("Please wait for generation to complete");
      return;
    }
    isUserScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
    setUnreadDuringScroll(false);

    setActiveSessionId(sessionId);
    saveAllChatSessions(sessions, sessionId);
    setInput("");
    setEditingMessageId(null);
  };

  // Delete a chat session
  const handleDeleteSession = (sessionId: string) => {
    const remaining = sessions.filter((s) => s.id !== sessionId);
    if (remaining.length === 0) {
      const fresh: ChatSession = {
        id: `session-${Date.now()}`,
        title: "Untitled Chat",
        hasCustomTitle: false,
        messages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
      saveAllChatSessions([fresh], fresh.id);
    } else {
      setSessions(remaining);
      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0].id);
        saveAllChatSessions(remaining, remaining[0].id);
      } else {
        saveAllChatSessions(remaining, activeSessionId);
      }
    }
    toast.info("Chat deleted");
  };

  // Rename a chat session
  const handleRenameSession = (sessionId: string, newTitle: string) => {
    setSessions((prev) => {
      const next = prev.map((s) =>
        s.id === sessionId ? { ...s, title: newTitle, hasCustomTitle: true } : s,
      );
      saveAllChatSessions(next, activeSessionIdRef.current);
      return next;
    });
  };

  // Trigger AI Title Generation after initial message exchange
  const triggerTitleGeneration = async (
    targetSessionId: string,
    assistantText: string,
    userText: string,
  ) => {
    const sess = sessionsRef.current.find((s) => s.id === targetSessionId);
    if (!sess || sess.hasCustomTitle) return;

    // Show skeleton loading indicator in drawer
    setSessions((prev) =>
      prev.map((s) => (s.id === targetSessionId ? { ...s, isGeneratingTitle: true } : s)),
    );

    try {
      const res = await generateChatTitle({
        data: {
          userMessage: userText,
          assistantReply: assistantText.slice(0, 350),
        },
      });

      const cleanTitle = res?.title?.trim() || userText.trim().slice(0, 26) || "New Chat";
      setSessions((prev) => {
        const next = prev.map((s) =>
          s.id === targetSessionId
            ? { ...s, title: cleanTitle, hasCustomTitle: true, isGeneratingTitle: false }
            : s,
        );
        saveAllChatSessions(next, activeSessionIdRef.current);
        return next;
      });
    } catch {
      const fallbackTitle = userText.trim().slice(0, 26) || "New Chat";
      setSessions((prev) => {
        const next = prev.map((s) =>
          s.id === targetSessionId
            ? { ...s, title: fallbackTitle, hasCustomTitle: true, isGeneratingTitle: false }
            : s,
        );
        saveAllChatSessions(next, activeSessionIdRef.current);
        return next;
      });
    }
  };

  // Monitor scroll position
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || messages.length <= 1) {
      isUserScrolledUpRef.current = false;
      setShowScrollBottomBtn(false);
      setUnreadDuringScroll(false);
      return;
    }

    const maxScrollable = container.scrollHeight - container.clientHeight;
    // Hide button if page isn't actually scrollable
    if (maxScrollable <= 100) {
      isUserScrolledUpRef.current = false;
      setShowScrollBottomBtn(false);
      setUnreadDuringScroll(false);
      return;
    }

    const distanceFromBottom = maxScrollable - container.scrollTop;
    const isNear = distanceFromBottom <= 60;

    if (isNear) {
      isUserScrolledUpRef.current = false;
      setShowScrollBottomBtn(false);
      setUnreadDuringScroll(false);
    } else {
      isUserScrolledUpRef.current = true;
      setShowScrollBottomBtn(true);
    }
  }, [messages.length]);

  // Jitter-free instant scroll to bottom during typewriter streaming
  const autoScrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (isUserScrolledUpRef.current) {
      setUnreadDuringScroll(true);
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, []);

  // User-initiated smooth glide to bottom
  const smoothScrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    isUserScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
    setUnreadDuringScroll(false);
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  // On first load or session switch, jump to bottom and hide scroll button
  useEffect(() => {
    isUserScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
    setUnreadDuringScroll(false);

    if (messages.length > 0 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [loadingMessages, messages.length, activeSessionId]);

  // Progressive Typewriter Animation Effect with jitter-free auto-scrolling
  const streamAssistantReply = async (
    fullReply: ChatMessage,
    promptText: string,
    replaceMessageId?: string,
  ) => {
    const fullText = fullReply.content;
    const replyId = fullReply.id;
    const sessionIdAtStart = activeSessionIdRef.current;
    activeStreamMessageIdRef.current = replyId;
    isAbortedRef.current = false;
    setIsStreamingActive(true);

    const tokens = fullText.match(/\S+|\s+/g) || [fullText];

    const placeholderMsg: ChatMessage = {
      ...fullReply,
      content: "",
      tmdbItems: undefined,
      isStreaming: true,
      isAborted: false,
    };

    if (replaceMessageId) {
      updateCurrentSessionMessages((prev) => {
        const found = prev.some((m) => m.id === replaceMessageId);
        if (found) {
          return prev.map((m) => (m.id === replaceMessageId ? placeholderMsg : m));
        }
        return [...prev, placeholderMsg];
      });
    } else {
      updateCurrentSessionMessages((prev) => [...prev, placeholderMsg]);
    }
    setThinking(false);

    let accumulatedText = "";
    // Smooth, fluid word-by-word progressive typewriter animation
    const stepSize = Math.max(1, Math.min(2, Math.floor(tokens.length / 80)));

    for (let i = 0; i < tokens.length; i += stepSize) {
      if (isAbortedRef.current) {
        break;
      }
      const chunk = tokens.slice(i, i + stepSize).join("");
      accumulatedText += chunk;

      updateCurrentSessionMessages((prev) =>
        prev.map((m) => (m.id === replyId ? { ...m, content: accumulatedText } : m)),
      );

      autoScrollToBottom();

      const isPunctuation = /[.,!?:;\n]/.test(chunk);
      const delay = isPunctuation ? 26 : 14;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const wasAborted = isAbortedRef.current;
    if (wasAborted) {
      updateCurrentSessionMessages((prev) =>
        prev.map((m) => (m.id === replyId ? { ...m, isStreaming: false, isAborted: true } : m)),
      );
      activeStreamMessageIdRef.current = null;
      setIsStreamingActive(false);
      return;
    }

    updateCurrentSessionMessages((prev) =>
      prev.map((m) =>
        m.id === replyId
          ? {
              ...m,
              content: fullText,
              tmdbItems: fullReply.tmdbItems,
              isStreaming: false,
              isAborted: false,
            }
          : m,
      ),
    );

    activeStreamMessageIdRef.current = null;
    setIsStreamingActive(false);
    autoScrollToBottom();

    // Trigger AI Title Generation for untitled chats
    void triggerTitleGeneration(sessionIdAtStart, fullText, promptText);
  };

  // Stop Generation Handler
  const handleStopGeneration = () => {
    isAbortedRef.current = true;
    setThinking(false);
    setIsStreamingActive(false);

    const activeId = activeStreamMessageIdRef.current;
    if (activeId) {
      updateCurrentSessionMessages((prev) =>
        prev.map((m) => (m.id === activeId ? { ...m, isStreaming: false, isAborted: true } : m)),
      );
      activeStreamMessageIdRef.current = null;
    } else {
      // Stopped before streaming started: record clean stopped assistant message
      const stoppedMsg: ChatMessage = {
        id: `stopped-${Date.now()}`,
        role: "assistant",
        content: "",
        isStreaming: false,
        isAborted: true,
        created_at: new Date().toISOString(),
      };
      updateCurrentSessionMessages((prev) => [...prev, stoppedMsg]);
    }
    toast.info("Generation stopped");
  };

  // Helper to trigger assistant response for an existing message list
  const triggerAssistantGeneration = async (
    promptText: string,
    currentHistory: ChatMessage[],
    replaceMessageId?: string,
  ) => {
    setThinking(true);
    isAbortedRef.current = false;

    isUserScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
    setUnreadDuringScroll(false);
    requestAnimationFrame(() => {
      smoothScrollToBottom();
    });

    try {
      const historyPayload = currentHistory
        .filter((m) => m.id !== replaceMessageId)
        .slice(-12)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const activeModelId =
        profile?.selected_model && AGENT_MODELS.some((m) => m.id === profile.selected_model)
          ? (profile.selected_model as string)
          : "gemini-3.8-flash";

      const res = await sendChatMessage({
        data: {
          content: promptText,
          model: activeModelId,
          displayName: profile?.display_name || undefined,
          customInstructions: profile?.custom_instructions || DEFAULT_SYSTEM_PROMPT,
          history: historyPayload,
        },
      });

      if (isAbortedRef.current) {
        setThinking(false);
        return;
      }

      const replies: ChatMessage[] = (res?.replies as ChatMessage[]) ?? [];
      if (replies.length > 0) {
        for (const reply of replies) {
          if (isAbortedRef.current) break;
          await streamAssistantReply(reply, promptText, replaceMessageId);
        }
      } else {
        setThinking(false);
      }
    } catch (err) {
      if (!isAbortedRef.current) {
        toast.error(err instanceof Error ? err.message : "Failed to send message");
      }
      setThinking(false);
    }
  };

  // In-place Regenerate Response Handler
  const handleRegenerate = async (messageId: string) => {
    if (thinking || isStreamingActive) return;

    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;

    const targetMsg = messages[idx];
    if (targetMsg.role === "assistant") {
      let userMsg: ChatMessage | null = null;
      for (let i = idx - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          userMsg = messages[i];
          break;
        }
      }
      if (!userMsg) return;

      const userIdx = messages.findIndex((m) => m.id === userMsg!.id);
      const history = messages.slice(0, userIdx + 1);

      await triggerAssistantGeneration(userMsg.content, history, targetMsg.id);
    } else {
      const history = messages.slice(0, idx + 1);
      const nextMsg = messages[idx + 1];
      const replaceId = nextMsg && nextMsg.role === "assistant" ? nextMsg.id : undefined;

      await triggerAssistantGeneration(targetMsg.content, history, replaceId);
    }
  };

  // Handle Edit Message Click
  const handleEditMessage = (m: ChatMessage) => {
    if (thinking || isStreamingActive) return;
    setEditingMessageId(m.id);
    setOriginalEditInput(m.content);
    setInput(m.content);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setOriginalEditInput("");
    setInput("");
  };

  const sendMessageWithText = async (rawText: string, editId: string | null) => {
    const text = rawText.trim();
    if (!text || thinking || isClearingChat) return;

    if (editId && text === originalEditInput.trim()) {
      return;
    }

    const isNegativeOrQuestion =
      /(mat|kyun|kyu|why|don'?t|do\s+not|never|not|nahi|nahin|na\b|kyon|kya|what|how|मत|क्यों|नहीं|ना|क्या|किसलिए)/i.test(
        text,
      );

    const isExplicitClearCommand =
      /^(?=.*(clear|delete|erase|clean|remove|reset|hata|uda|saaf|डिलीट|हटा|साफ़|उड़ा|क्लियर))(?=.*(chat|history|conversation|message|baatein|चैट|बातें|मैसेज|हिस्ट्री)).*$/i.test(
        text,
      ) ||
      /^\/?(clear|reset)$/i.test(text) ||
      /^(nayi|new)\s*chat/i.test(text);

    const isClearRequest = !isNegativeOrQuestion && isExplicitClearCommand;

    if (isClearRequest) {
      setInput("");
      handleCancelEdit();
      setShowClearConfirm(true);
      return;
    }

    let nextMessages: ChatMessage[] = [];

    if (editId) {
      const editIdx = messages.findIndex((m) => m.id === editId);
      if (editIdx !== -1) {
        nextMessages = messages.slice(0, editIdx + 1).map((m, idx) => {
          if (idx === editIdx) {
            return { ...m, content: text };
          }
          return m;
        });
      } else {
        const optimistic: ChatMessage = {
          id: `tmp-${Date.now()}`,
          role: "user",
          content: text,
          created_at: new Date().toISOString(),
        };
        nextMessages = [...messages, optimistic];
      }
      handleCancelEdit();
    } else {
      const optimisticId = `tmp-${Date.now()}`;
      const optimistic: ChatMessage = {
        id: optimisticId,
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
      };
      nextMessages = [...messages, optimistic];
      setInput("");
    }

    updateCurrentSessionMessages(() => nextMessages);

    // If active session is untitled, set preliminary title and set isGeneratingTitle
    setSessions((prev) => {
      const activeId = activeSessionIdRef.current;
      const next = prev.map((s) => {
        if (s.id === activeId && (!s.hasCustomTitle || s.title === "Untitled Chat")) {
          const initialTitle = text.trim().slice(0, 26) || "New Chat";
          return {
            ...s,
            title: initialTitle,
            isGeneratingTitle: true,
            updated_at: new Date().toISOString(),
          };
        }
        return s;
      });
      saveAllChatSessions(next, activeId);
      return next;
    });

    await triggerAssistantGeneration(text, nextMessages);
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessageWithText(input, editingMessageId);
  };

  if (loading || !session) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </main>
    );
  }

  // Settings View Mode
  if (viewMode === "profile") {
    return (
      <ProfileView
        onBack={() => {
          setViewMode("chat");
          loadLocalSessions();
        }}
        onClearMessages={() => {
          updateCurrentSessionMessages(() => []);
        }}
      />
    );
  }

  const isEditUnchanged = editingMessageId ? input.trim() === originalEditInput.trim() : false;
  const isSendDisabled = !input.trim() || isEditUnchanged || thinking || isClearingChat;
  const isGenerating = thinking || isStreamingActive;

  return (
    <main className="chat-canvas-bg flex h-dvh flex-col bg-background relative overflow-hidden">
      {/* Multi-Chat Drawer */}
      <ChatSidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onCreateNewChat={handleCreateNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
      />

      {/* Safety Confirmation Modal Before Deleting Chat */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            key="clear-confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4"
          >
            <motion.div
              key="clear-confirm-modal"
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 12 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-full max-w-xs rounded-3xl bg-card border border-border/80 p-5 shadow-2xl text-center space-y-4"
            >
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertTriangle className="size-6 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground">Are you sure?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to delete all messages in this chat? All messages will be
                  permanently cleared.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 rounded-2xl bg-secondary hover:bg-secondary/80 py-2.5 text-xs font-semibold text-foreground transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowClearConfirm(false);
                    executeClearChat();
                  }}
                  className="flex-1 rounded-2xl bg-destructive hover:bg-destructive/90 py-2.5 text-xs font-semibold text-destructive-foreground transition-all shadow-xs cursor-pointer"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chat Clearing Full-Canvas Overlay Loader */}
      <AnimatePresence>
        {isClearingChat && (
          <motion.div
            key="clearing-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-card border border-border/80 shadow-2xl text-center max-w-xs"
            >
              <Loader2 className="size-8 text-primary animate-spin" />
              <div>
                <h3 className="font-bold text-base text-foreground">Clearing Chat...</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Removing conversation memory from local storage...
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gemini Ambient Bottom Blue Aura Glow (Visible on initial load / empty chat, smoothly fades when chatting) */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 bottom-0 h-[65vh] transition-opacity duration-700 ease-out z-0 ${
          messages.length === 0 ? "opacity-100 dark:opacity-40" : "opacity-0"
        }`}
        style={{
          background:
            "radial-gradient(ellipse 95% 65% at 50% 100%, rgba(147, 197, 253, 0.48) 0%, rgba(191, 219, 254, 0.26) 38%, rgba(224, 242, 254, 0.1) 68%, transparent 100%)",
        }}
      />

      {/* Top Header Navigation */}
      <header className="bg-background/80 sticky top-0 z-20 flex items-center justify-between border-0 px-4 py-3 backdrop-blur-2xl">
        {/* Left: Multi-chat Drawer Toggle + Aarambh AI Model Switcher */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="flex size-10 items-center justify-center rounded-full text-foreground/80 hover:text-foreground bg-secondary/70 hover:bg-secondary active:scale-95 transition-all cursor-pointer shrink-0"
            title="All Chats"
            aria-label="All Chats"
          >
            <PanelLeft className="size-5 stroke-[2]" />
          </button>

          {/* Active Model Display Badge (Read-Only with Aarambh Logo) */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/80 text-xs sm:text-sm font-semibold text-foreground border border-border/40 select-none shadow-xs">
            <div className="size-5 rounded-md overflow-hidden shrink-0 border border-border/50">
              <img
                src={LEOMA_IDENTITY.avatar}
                alt="Aarambh Logo"
                className="size-full object-cover"
              />
            </div>
            <span className="truncate max-w-[150px] sm:max-w-none">{activeModel.name}</span>
          </div>
        </div>

        {/* Right Action Icons: Clean Plus (+) for New Chat and Settings Gear */}
        <div className="flex items-center gap-2">
          {/* Clean New Chat Plus Button */}
          <button
            type="button"
            onClick={handleCreateNewChat}
            className="flex size-10 items-center justify-center rounded-full text-foreground/80 hover:text-foreground bg-secondary/70 hover:bg-secondary active:scale-95 transition-all cursor-pointer"
            title="New Chat"
            aria-label="New Chat"
          >
            <Plus className="size-5 stroke-[2]" />
          </button>

          {/* Clean Settings Gear Button */}
          <button
            type="button"
            onClick={() => setViewMode("profile")}
            className="flex size-10 items-center justify-center rounded-full text-foreground/80 hover:text-foreground bg-secondary/70 hover:bg-secondary active:scale-95 transition-all cursor-pointer"
            title="Settings & Persona"
            aria-label="Settings"
          >
            <Settings className="size-5 stroke-[2]" />
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-3.5 py-4 relative z-10"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 52px, black calc(100% - 56px), transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 52px, black calc(100% - 56px), transparent 100%)",
        }}
      >
        {loadingMessages && messages.length === 0 ? (
          <ChatSkeletonLoader />
        ) : messages.length === 0 && !thinking ? (
          <div className="animate-fade-up mx-auto my-auto flex flex-col items-center justify-center px-4 text-center select-none pt-20 sm:pt-28">
            <img
              src="/aarambh-logo-cute.png"
              alt="Aarambh AI Logo"
              className="h-20 sm:h-24 w-auto object-contain transition-transform hover:scale-105"
            />
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-5">
              Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}!
            </h2>
            <p className="text-muted-foreground/80 mt-2 text-sm sm:text-base leading-relaxed max-w-sm mx-auto font-normal">
              Ask anything, explore topics, solve problems, or chat freely with Aarambh AI.
            </p>
          </div>
        ) : null}

        {messages.map((m, idx) => (
          <MessageBubble
            key={m.id}
            message={m}
            previousMessage={idx > 0 ? messages[idx - 1] : undefined}
            nextMessage={idx < messages.length - 1 ? messages[idx + 1] : undefined}
            onEdit={handleEditMessage}
            onRegenerate={handleRegenerate}
          />
        ))}

        {/* If last message is user message with no assistant reply and not currently thinking/streaming */}
        {!thinking &&
          !isStreamingActive &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "user" && (
            <div className="w-full max-w-3xl select-text pt-1 px-4 my-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 mb-2.5 select-none">
                <img
                  src={LEOMA_IDENTITY.avatar}
                  alt={LEOMA_IDENTITY.name}
                  className="size-7 rounded-full object-cover border border-primary/20 shadow-xs"
                />
                <span className="text-[15px] sm:text-[16.5px] font-bold tracking-tight text-foreground">
                  {LEOMA_IDENTITY.name}
                </span>
              </div>
              <div className="pl-9 space-y-2">
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full inline-block select-none">
                  Generation stopped
                </span>
                <div className="flex items-center gap-3 pt-1 text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => handleRegenerate(messages[messages.length - 1].id)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full hover:bg-secondary active:scale-95 transition-all cursor-pointer text-muted-foreground hover:text-foreground text-sm font-semibold"
                    title="Generate AI response"
                  >
                    <RotateCcw className="size-4" />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        {thinking ? <TypingBubble /> : null}

        <div className="h-4" />
      </div>

      {/* Scroll to Bottom Button */}
      <AnimatePresence>
        {showScrollBottomBtn && messages.length > 1 && (
          <motion.button
            key="scroll-bottom-btn"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.18 }}
            type="button"
            onClick={smoothScrollToBottom}
            className="absolute bottom-24 right-5 z-20 flex size-10 items-center justify-center rounded-full bg-primary/95 text-primary-foreground shadow-lg backdrop-blur-md hover:bg-primary active:scale-95 transition-all cursor-pointer"
            aria-label="Scroll to bottom"
            title="Jump to latest message"
          >
            <ArrowDown className="size-4.5 stroke-[2.5]" />
            {unreadDuringScroll && (
              <span className="absolute -top-1 -right-1 flex size-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-3 bg-emerald-500" />
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input Composer Dock */}
      <div className="bg-background/90 sticky bottom-0 z-20 w-full px-4 pb-4 pt-2 backdrop-blur-2xl">
        <div className="mx-auto max-w-2xl">
          {/* Active Edit Message Banner */}
          {editingMessageId && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-150 mb-2 flex items-center justify-between px-4 py-2 rounded-2xl bg-secondary/80 border border-primary/20 text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-primary font-semibold min-w-0">
                <Pencil className="size-3.5 shrink-0" />
                <span className="truncate">Editing your message</span>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0">
                <span>(Original will update)</span>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="ml-1 text-primary/80 hover:text-primary p-0.5 rounded-full hover:bg-primary/20 transition-colors cursor-pointer"
                  title="Cancel edit"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            </div>
          )}

          <form
            onSubmit={send}
            className="bg-[#f0f4f9] dark:bg-[#1e1f20] focus-within:ring-2 focus-within:ring-primary/40 flex items-center gap-3 rounded-full px-5 py-1.5 sm:py-2 transition-all shadow-xs"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Say anything or ask Aarambh AI..."
              className="w-full bg-transparent py-2.5 text-[16px] sm:text-[17.5px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none font-medium leading-relaxed"
            />

            {isGenerating ? (
              /* Stop Generation Button */
              <Button
                type="button"
                size="icon"
                onClick={handleStopGeneration}
                className="size-10.5 sm:size-11 shrink-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-90 transition-all cursor-pointer shadow-xs"
                aria-label="Stop generating"
                title="Stop generating"
              >
                <Square className="size-4 fill-current" />
              </Button>
            ) : (
              /* Send Message Button */
              <Button
                type="submit"
                size="icon"
                disabled={isSendDisabled}
                className="size-10.5 sm:size-11 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                aria-label="Send message"
              >
                <SendHorizontal className="size-5" />
              </Button>
            )}
          </form>
          <p className="text-center text-[12px] sm:text-[13px] text-muted-foreground/70 mt-2 select-none hidden sm:block font-medium">
            Aarambh AI can make mistakes. Verify important info.
          </p>
        </div>
      </div>
    </main>
  );
}
