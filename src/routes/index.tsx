import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { sendChatMessage } from "@/lib/ai.functions";
import { MessageBubble, TypingBubble, type ChatMessage } from "@/components/chat/MessageBubble";
import { ChatSkeletonLoader } from "@/components/chat/ChatSkeletonLoader";
import { ProfileView } from "@/components/chat/ProfileView";
import { Button } from "@/components/ui/button";
import { LEOMA_IDENTITY, DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "तत्व AI — Private AI Chat" },
      {
        name: "description",
        content:
          "A private, intelligent AI chat agent with local storage and deep reasoning capabilities.",
      },
      { property: "og:title", content: "तत्व AI" },
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
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

  // Execute chat memory clearing with smooth animation
  const executeClearChat = () => {
    setIsClearingChat(true);
    setTimeout(() => {
      setMessages([]);
      persistMessages([]);
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isUserScrolledUpRef = useRef(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [unreadDuringScroll, setUnreadDuringScroll] = useState(false);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  // Load chat history from localStorage
  const loadLocalMessages = useCallback(() => {
    setLoadingMessages(true);
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ai_agent_messages_v2");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setMessages(parsed);
          }
        }
      } catch (err) {
        console.warn("Error reading local messages", err);
      }
    }
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    if (session) {
      loadLocalMessages();
    }
  }, [session, loadLocalMessages]);

  // Monitor scroll position: detect when user intentionally scrolls up to read history
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNear = distanceFromBottom <= 60;

    if (isNear) {
      isUserScrolledUpRef.current = false;
      setShowScrollBottomBtn(false);
      setUnreadDuringScroll(false);
    } else {
      isUserScrolledUpRef.current = true;
      setShowScrollBottomBtn(true);
    }
  }, []);

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

  // On first load of messages, jump to bottom directly
  useEffect(() => {
    if (messages.length > 0 && !isUserScrolledUpRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [loadingMessages, messages.length]);

  const persistMessages = (msgs: ChatMessage[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ai_agent_messages_v2", JSON.stringify(msgs));
      } catch {
        // ignore
      }
    }
  };

  // Progressive Typewriter Animation Effect with jitter-free auto-scrolling
  const streamAssistantReply = async (fullReply: ChatMessage) => {
    const fullText = fullReply.content;
    const replyId = fullReply.id;
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

    setMessages((prev) => [...prev, placeholderMsg]);
    setThinking(false);

    let accumulatedText = "";
    const stepSize = Math.max(1, Math.floor(tokens.length / 120));

    for (let i = 0; i < tokens.length; i += stepSize) {
      if (isAbortedRef.current) {
        break;
      }
      const chunk = tokens.slice(i, i + stepSize).join("");
      accumulatedText += chunk;

      setMessages((prev) =>
        prev.map((m) => (m.id === replyId ? { ...m, content: accumulatedText } : m)),
      );

      autoScrollToBottom();

      const delay = /[.!?\n]/.test(chunk) ? 28 : 14;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const wasAborted = isAbortedRef.current;
    if (wasAborted) {
      // User requested: "पूरा सब कुछ गायब हो जाएगा" - remove incomplete response completely
      setMessages((prev) => {
        const cleaned = prev.filter((m) => m.id !== replyId);
        persistMessages(cleaned);
        return cleaned;
      });
      activeStreamMessageIdRef.current = null;
      setIsStreamingActive(false);
      return;
    }

    setMessages((prev) => {
      const final = prev.map((m) =>
        m.id === replyId
          ? {
              ...m,
              content: fullText,
              tmdbItems: fullReply.tmdbItems,
              isStreaming: false,
              isAborted: false,
            }
          : m,
      );
      persistMessages(final);
      return final;
    });

    activeStreamMessageIdRef.current = null;
    setIsStreamingActive(false);
    autoScrollToBottom();
  };

  // Stop Generation Handler
  const handleStopGeneration = () => {
    isAbortedRef.current = true;
    setThinking(false);
    setIsStreamingActive(false);

    const activeId = activeStreamMessageIdRef.current;
    if (activeId) {
      // Incomplete generation is removed so everything is clean ("पूरा सब कुछ गायब हो जाएगा")
      setMessages((prev) => {
        const updated = prev.filter((m) => m.id !== activeId);
        persistMessages(updated);
        return updated;
      });
      activeStreamMessageIdRef.current = null;
    }
    toast.info("Generation stopped");
  };

  // Helper to trigger assistant response for an existing message list
  const triggerAssistantGeneration = async (promptText: string, currentHistory: ChatMessage[]) => {
    setThinking(true);
    isAbortedRef.current = false;

    // Glide to bottom on new prompt
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
          await streamAssistantReply(reply);
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

    // Locate the preceding user message
    let userMsg: ChatMessage | null = null;
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        userMsg = messages[i];
        break;
      }
    }

    if (!userMsg) return;

    // Prune the current assistant response and any following messages
    const pruned = messages.slice(0, idx);
    setMessages(pruned);
    persistMessages(pruned);

    await triggerAssistantGeneration(userMsg.content, pruned);
  };

  // Handle Edit Message Click
  const handleEditMessage = (m: ChatMessage) => {
    setEditingMessageId(m.id);
    setInput(m.content);
    setOriginalEditInput(m.content);
    inputRef.current?.focus();
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setOriginalEditInput("");
    setInput("");
  };

  // Core Send Message function (Supports form send and edit)
  const sendMessageWithText = async (rawText: string, editId?: string | null) => {
    const text = rawText.trim();
    if (!text || thinking || isClearingChat) return;

    // Check if user is in Edit mode and hasn't made any edits
    if (editId && text === originalEditInput.trim()) {
      return;
    }

    // Check if user is asking AI to clear/delete entire chat history
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
      // Find edited message index
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

    setMessages(nextMessages);
    persistMessages(nextMessages);

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
          loadLocalMessages();
        }}
        onClearMessages={() => {
          setMessages([]);
          persistMessages([]);
        }}
      />
    );
  }

  const isEditUnchanged = editingMessageId ? input.trim() === originalEditInput.trim() : false;
  const isSendDisabled = !input.trim() || isEditUnchanged || thinking || isClearingChat;
  const isGenerating = thinking || isStreamingActive;

  return (
    <main className="chat-canvas-bg flex h-dvh flex-col bg-background relative overflow-hidden">
      {/* Safety Confirmation Modal Before Deleting Chat */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 px-4">
          <div className="w-full max-w-xs rounded-3xl bg-card border border-border/80 p-5 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6 stroke-[2.2]" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-foreground">Are you sure?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to delete all chat history? All messages will be permanently
                cleared.
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
          </div>
        </div>
      )}

      {/* AI Chat Clearing Full-Canvas Overlay Loader */}
      {isClearingChat && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-card border border-border/80 shadow-2xl text-center max-w-xs">
            <Loader2 className="size-8 text-primary animate-spin" />
            <div>
              <h3 className="font-bold text-base text-foreground">Clearing Chat...</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Removing conversation memory from local storage...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Navigation */}
      <header className="bg-background/70 sticky top-0 z-20 flex items-center justify-between border-0 px-4 py-3 backdrop-blur-2xl">
        {/* Aarambh Logo & Name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative size-10 shrink-0">
            <img
              src={LEOMA_IDENTITY.avatar}
              alt="Aarambh Logo"
              className="size-10 rounded-full object-cover shadow-xs border border-primary/20"
            />
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-background bg-emerald-500" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center">
              <p className="truncate text-base font-bold tracking-tight leading-tight text-foreground">
                {LEOMA_IDENTITY.name}
              </p>
            </div>
            <p className="text-muted-foreground truncate text-[11px] font-semibold">online</p>
          </div>
        </div>

        {/* Clean Settings Gear Button */}
        <button
          type="button"
          onClick={() => setViewMode("profile")}
          className="flex size-9 items-center justify-center rounded-full text-foreground/80 hover:text-foreground bg-secondary/60 hover:bg-secondary active:scale-95 transition-all cursor-pointer"
          title="Settings & Persona"
        >
          <Settings className="size-4.5 stroke-[2]" />
        </button>
      </header>

      {/* Messages Scroll Area (no scroll-smooth in container to prevent scroll fight/jitter!) */}
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
              <img src={LEOMA_IDENTITY.avatar} alt="Aarambh" className="size-full object-cover" />
            </div>
            <div className="flex items-center justify-center">
              <h2 className="text-xl sm:text-2xl font-black text-foreground">
                Yo{profile?.display_name ? ` ${profile.display_name}` : ""}! {greetingEmoji}
              </h2>
            </div>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-xs mx-auto font-medium">
              Say anything, ask doubts, explore anime & movies, or tell Aarambh to clear chat
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
        <div ref={bottomRef} className="h-28 shrink-0 pointer-events-none" />
      </div>

      {/* Floating Jump to Latest Button when User is Scrolled Up */}
      {showScrollBottomBtn && (
        <button
          type="button"
          onClick={smoothScrollToBottom}
          className="fixed bottom-24 right-4 sm:right-6 z-30 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-900/95 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-xl hover:scale-105 active:scale-95 transition-all border border-white/20 dark:border-slate-800/20 backdrop-blur-md cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-150"
          aria-label="Scroll to latest messages"
        >
          <ArrowDown className="size-3.5 stroke-[2.5]" />
          <span>Latest</span>
          {unreadDuringScroll && (
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
          )}
        </button>
      )}

      {/* Input Bar & Editing Banner */}
      <div className="bg-background/80 sticky bottom-0 z-20 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl">
        <div className="mx-auto max-w-3xl">
          {/* Editing Message Banner - Small, Sleek & Minimal */}
          {editingMessageId && (
            <div className="flex items-center justify-start mb-1.5 px-1 animate-in fade-in slide-in-from-bottom-1 duration-150">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full shadow-2xs">
                <Pencil className="size-3 shrink-0" />
                <span>Editing message</span>
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
              placeholder="Say anything or ask Aarambh..."
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
            Aarambh can make mistakes. Verify important info.
          </p>
        </div>
      </div>
    </main>
  );
}
