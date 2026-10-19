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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { sendChatMessage, generateChatTitle } from "@/lib/ai.functions";
import { MessageBubble, TypingBubble, type ChatMessage } from "@/components/chat/MessageBubble";
import { ChatSkeletonLoader } from "@/components/chat/ChatSkeletonLoader";
import { ProfileView } from "@/components/chat/ProfileView";
import { ChatSidebarDrawer } from "@/components/chat/ChatSidebarDrawer";
import { loadAllChatSessions, saveAllChatSessions, type ChatSession } from "@/lib/chatSessions";
import { Button } from "@/components/ui/button";
import { LEOMA_IDENTITY, DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";

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

  // Dynamic AI-chosen vibe emoji for the user greeting
  const greetingEmoji = useMemo(() => {
    const emojis = ["🔥", "⚡", "✨", "🚀", "😎", "🤙", "💫", "🌟", "🎯", "🤘"];
    const nameSeed = (profile?.display_name || "bro")
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return emojis[(nameSeed + new Date().getHours()) % emojis.length];
  }, [profile?.display_name]);

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

    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: "Untitled Chat",
      hasCustomTitle: false,
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const nextSessions = [newSession, ...sessions];
    setSessions(nextSessions);
    setActiveSessionId(newSession.id);
    saveAllChatSessions(nextSessions, newSession.id);
    setInput("");
    setEditingMessageId(null);
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
    if (!sess || sess.hasCustomTitle || sess.isGeneratingTitle) return;

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

      if (res?.title && res.title.trim()) {
        const cleanTitle = res.title.trim();
        setSessions((prev) => {
          const next = prev.map((s) =>
            s.id === targetSessionId
              ? { ...s, title: cleanTitle, hasCustomTitle: true, isGeneratingTitle: false }
              : s,
          );
          saveAllChatSessions(next, activeSessionIdRef.current);
          return next;
        });
      } else {
        setSessions((prev) =>
          prev.map((s) => (s.id === targetSessionId ? { ...s, isGeneratingTitle: false } : s)),
        );
      }
    } catch {
      setSessions((prev) =>
        prev.map((s) => (s.id === targetSessionId ? { ...s, isGeneratingTitle: false } : s)),
      );
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
  const streamAssistantReply = async (fullReply: ChatMessage, promptText: string) => {
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

    updateCurrentSessionMessages((prev) => [...prev, placeholderMsg]);
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
      updateCurrentSessionMessages((prev) => prev.filter((m) => m.id !== replyId));
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
      updateCurrentSessionMessages((prev) => prev.filter((m) => m.id !== activeId));
      activeStreamMessageIdRef.current = null;
    }
    toast.info("Generation stopped");
  };

  // Helper to trigger assistant response for an existing message list
  const triggerAssistantGeneration = async (promptText: string, currentHistory: ChatMessage[]) => {
    setThinking(true);
    isAbortedRef.current = false;

    isUserScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
    setUnreadDuringScroll(false);
    requestAnimationFrame(() => {
      smoothScrollToBottom();
    });

    try {
      const historyPayload = currentHistory.slice(-12).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendChatMessage({
        data: {
          content: promptText,
          model: profile?.selected_model || "gemini-4-argon",
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
          await streamAssistantReply(reply, promptText);
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

  // Regenerate Response Handler
  const handleRegenerate = async (messageId: string) => {
    if (thinking || isStreamingActive) return;

    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;

    let userMsg: ChatMessage | null = null;
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        userMsg = messages[i];
        break;
      }
    }

    if (!userMsg) return;

    const pruned = messages.slice(0, idx);
    updateCurrentSessionMessages(() => pruned);

    await triggerAssistantGeneration(userMsg.content, pruned);
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

      {/* Top Header Navigation */}
      <header className="bg-background/70 sticky top-0 z-20 flex items-center justify-between border-0 px-4 py-3 backdrop-blur-2xl">
        {/* Left: Aarambh AI Logo or Multi-chat Toggle when multiple chats exist */}
        {sessions.length > 1 ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="flex size-9 items-center justify-center rounded-full text-foreground/80 hover:text-foreground bg-secondary/60 hover:bg-secondary active:scale-95 transition-all cursor-pointer shrink-0"
              title="All Chats"
              aria-label="All Chats"
            >
              <PanelLeft className="size-4.5 stroke-[2]" />
            </button>

            <div className="min-w-0">
              <p className="truncate text-base font-bold tracking-tight leading-tight text-foreground">
                {LEOMA_IDENTITY.name}
              </p>
              <p className="text-muted-foreground truncate text-[11px] font-semibold">
                {currentSession?.title || "Untitled Chat"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative size-10 shrink-0">
              <img
                src={LEOMA_IDENTITY.avatar}
                alt="Aarambh AI Logo"
                className="size-10 rounded-full object-cover shadow-xs border border-primary/20"
              />
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-background bg-emerald-500" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-bold tracking-tight leading-tight text-foreground">
                {LEOMA_IDENTITY.name}
              </p>
              <p className="text-muted-foreground truncate text-[11px] font-semibold">online</p>
            </div>
          </div>
        )}

        {/* Right Action Icons: Clean Plus (+) for New Chat and Settings Gear */}
        <div className="flex items-center gap-2">
          {/* Clean New Chat Plus Button with exact same subtle styling */}
          <button
            type="button"
            onClick={handleCreateNewChat}
            className="flex size-9 items-center justify-center rounded-full text-foreground/80 hover:text-foreground bg-secondary/60 hover:bg-secondary active:scale-95 transition-all cursor-pointer"
            title="New Chat"
            aria-label="New Chat"
          >
            <Plus className="size-4.5 stroke-[2]" />
          </button>

          {/* Clean Settings Gear Button */}
          <button
            type="button"
            onClick={() => setViewMode("profile")}
            className="flex size-9 items-center justify-center rounded-full text-foreground/80 hover:text-foreground bg-secondary/60 hover:bg-secondary active:scale-95 transition-all cursor-pointer"
            title="Settings & Persona"
            aria-label="Settings"
          >
            <Settings className="size-4.5 stroke-[2]" />
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="no-scrollbar flex-1 space-y-3.5 overflow-y-auto px-3.5 py-4"
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
          <div className="animate-fade-up mx-auto mt-20 max-w-md px-4 text-center select-none">
            <div className="relative mx-auto size-20 rounded-3xl overflow-hidden shadow-xl bg-card/50 border border-border/30 mb-5">
              <img
                src={LEOMA_IDENTITY.avatar}
                alt="Aarambh AI"
                className="size-full object-cover"
              />
            </div>
            <div className="flex items-center justify-center">
              <h2 className="text-xl sm:text-2xl font-black text-foreground">
                Yo{profile?.display_name ? ` ${profile.display_name}` : ""}! {greetingEmoji}
              </h2>
            </div>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-xs mx-auto font-medium">
              Say anything, ask doubts, explore anime & movies, or tell Aarambh AI to clear chat
              anytime...
            </p>
          </div>
        ) : null}

        {messages.map((m, idx) => (
          <MessageBubble
            key={m.id}
            message={m}
            previousMessage={idx > 0 ? messages[idx - 1] : undefined}
            onEdit={handleEditMessage}
            onRegenerate={handleRegenerate}
          />
        ))}

        {thinking ? <TypingBubble /> : null}

        <div className="h-4" />
      </div>

      {/* Scroll to Bottom Button (Only shown when actually scrolled up in longer conversations) */}
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
            className="absolute bottom-24 right-5 z-20 flex size-9 items-center justify-center rounded-full bg-primary/95 text-primary-foreground shadow-lg backdrop-blur-md hover:bg-primary active:scale-95 transition-all cursor-pointer"
            aria-label="Scroll to bottom"
            title="Jump to latest message"
          >
            <ArrowDown className="size-4 stroke-[2.5]" />
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
      <div className="bg-background/90 sticky bottom-0 z-20 w-full px-3.5 pb-4 pt-2 backdrop-blur-2xl">
        <div className="mx-auto max-w-2xl">
          {/* Active Edit Message Banner */}
          {editingMessageId && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-150 mb-2 flex items-center justify-between px-3.5 py-1.5 rounded-2xl bg-secondary/80 border border-primary/20 text-xs">
              <div className="flex items-center gap-1.5 text-primary font-semibold min-w-0">
                <Pencil className="size-3 shrink-0" />
                <span className="truncate">Editing your message</span>
              </div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                <span>(Original will update)</span>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="ml-1 text-primary/80 hover:text-primary p-0.5 rounded-full hover:bg-primary/20 transition-colors cursor-pointer"
                  title="Cancel edit"
                >
                  <X className="size-3" />
                </button>
              </span>
            </div>
          )}

          <form
            onSubmit={send}
            className="bg-[#f0f4f9] dark:bg-[#1e1f20] focus-within:ring-1 focus-within:ring-primary/40 flex items-center gap-2 rounded-full px-4 py-1.5 transition-all shadow-xs"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Say anything or ask Aarambh AI..."
              className="w-full bg-transparent py-2.5 text-[15px] sm:text-[16px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none font-medium"
            />

            {isGenerating ? (
              /* Stop Generation Button */
              <Button
                type="button"
                size="icon"
                onClick={handleStopGeneration}
                className="size-9.5 shrink-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-90 transition-all cursor-pointer shadow-xs"
                aria-label="Stop generating"
                title="Stop generating"
              >
                <Square className="size-3.5 fill-current" />
              </Button>
            ) : (
              /* Send Message Button */
              <Button
                type="submit"
                size="icon"
                disabled={isSendDisabled}
                className="size-9.5 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                aria-label="Send message"
              >
                <SendHorizontal className="size-4" />
              </Button>
            )}
          </form>
          <p className="text-center text-[11px] text-muted-foreground/70 mt-1.5 select-none hidden sm:block font-medium">
            Aarambh AI can make mistakes. Verify important info.
          </p>
        </div>
      </div>
    </main>
  );
}
