import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, CheckCheck, Loader2, SendHorizontal, Trash2, X, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { sendChatMessage } from "@/lib/ai.functions";
import { MessageBubble, TypingBubble, type ChatMessage } from "@/components/chat/MessageBubble";
import { ChatSkeletonLoader } from "@/components/chat/ChatSkeletonLoader";
import { ProfileView } from "@/components/chat/ProfileView";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LEOMA_IDENTITY, DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Agent — Private Chat" },
      {
        name: "description",
        content: "Chat privately with your personal AI Agent.",
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isSelectMode = selectedIds.length > 0;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // View state: chat or profile/settings tab
  const [viewMode, setViewMode] = useState<"chat" | "profile">("chat");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const scrollToBottom = useCallback(
    (smooth = true, blockPosition: ScrollLogicalPosition = "center") => {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({
          behavior: smooth ? "smooth" : "auto",
          block: blockPosition,
        });
      });
    },
    [],
  );

  useEffect(() => {
    if (messages.length > 0 || thinking) {
      scrollToBottom(true, "center");
    }
  }, [messages, thinking, scrollToBottom]);

  const persistMessages = (msgs: ChatMessage[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ai_agent_messages_v2", JSON.stringify(msgs));
      } catch {
        // ignore
      }
    }
  };

  // Progressive Typewriter Animation Effect for New Style Streaming
  const streamAssistantReply = async (fullReply: ChatMessage) => {
    const fullText = fullReply.content;
    const replyId = fullReply.id;

    // Split text into words and whitespace
    const tokens = fullText.match(/\S+|\s+/g) || [fullText];

    // Append initial empty message with isStreaming active
    const placeholderMsg: ChatMessage = {
      ...fullReply,
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, placeholderMsg]);
    setThinking(false);

    let accumulatedText = "";
    // Reveal tokens in fluid batches
    const stepSize = Math.max(1, Math.floor(tokens.length / 120));

    for (let i = 0; i < tokens.length; i += stepSize) {
      const chunk = tokens.slice(i, i + stepSize).join("");
      accumulatedText += chunk;

      setMessages((prev) =>
        prev.map((m) => (m.id === replyId ? { ...m, content: accumulatedText } : m)),
      );

      scrollToBottom(true, "center");

      const delay = /[.!?\n]/.test(chunk) ? 32 : 16;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Finalize with full text and remove streaming cursor
    setMessages((prev) => {
      const final = prev.map((m) =>
        m.id === replyId ? { ...m, content: fullText, isStreaming: false } : m,
      );
      persistMessages(final);
      return final;
    });

    scrollToBottom(true, "center");
  };

  // Send Message
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;

    const optimisticId = `tmp-${Date.now()}`;
    setInput("");

    const optimistic: ChatMessage = {
      id: optimisticId,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    const nextMessages = [...messages, optimistic];
    setMessages(nextMessages);
    persistMessages(nextMessages);
    setThinking(true);
    scrollToBottom(true, "center");

    try {
      const historyPayload = nextMessages.slice(-12).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendChatMessage({
        data: {
          content: text,
          model: profile?.selected_model || "gemini-4-argon",
          displayName: profile?.display_name || undefined,
          customInstructions: profile?.custom_instructions || DEFAULT_SYSTEM_PROMPT,
          history: historyPayload,
        },
      });

      const replies: ChatMessage[] = (res?.replies as ChatMessage[]) ?? [];
      if (replies.length > 0) {
        for (const reply of replies) {
          await streamAssistantReply(reply);
        }
      } else {
        setThinking(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
      setThinking(false);
    }
  };

  const handleHoldMessage = (m: ChatMessage) => {
    setSelectedIds((prev) => (prev.includes(m.id) ? prev : [...prev, m.id]));
  };

  const handleClickMessage = (m: ChatMessage) => {
    if (selectedIds.length > 0) {
      setSelectedIds((prev) =>
        prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id],
      );
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === messages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(messages.map((m) => m.id));
    }
  };

  const handleCopySelected = () => {
    const selectedMsgs = messages.filter((m) => selectedIds.includes(m.id));
    if (selectedMsgs.length === 0) return;
    const combined = selectedMsgs.map((m) => m.content).join("\n\n");
    if (combined) {
      void navigator.clipboard?.writeText(combined);
      toast.success(`Copied ${selectedMsgs.length} message${selectedMsgs.length > 1 ? "s" : ""}`);
    }
    setSelectedIds([]);
  };

  const handleDeleteSelected = () => {
    const remaining = messages.filter((m) => !selectedIds.includes(m.id));
    setMessages(remaining);
    persistMessages(remaining);
    setSelectedIds([]);
    setDeleteConfirmOpen(false);
    toast.success("Selected messages deleted");
  };

  const handleClearAllMessages = () => {
    setMessages([]);
    persistMessages([]);
    setSelectedIds([]);
    setDeleteConfirmOpen(false);
    toast.success("All messages cleared!");
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

  return (
    <main className="chat-canvas-bg flex h-dvh flex-col bg-background">
      {/* Top Header Navigation */}
      {isSelectMode ? (
        <header className="bg-background/60 sticky top-0 z-30 flex items-center justify-between border-0 px-4 py-3 backdrop-blur-2xl animate-fade-in">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 active:scale-95 transition-all text-foreground cursor-pointer"
              title="Close selection"
            >
              <X className="size-5" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {selectedIds.length} selected
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex size-9 items-center justify-center rounded-full text-foreground hover:bg-secondary active:scale-95 transition-all cursor-pointer"
              title="Select All"
            >
              <CheckCheck className="size-4.5" />
            </button>

            <button
              type="button"
              onClick={handleCopySelected}
              className="flex size-9 items-center justify-center rounded-full text-foreground hover:bg-secondary active:scale-95 transition-all cursor-pointer"
              title="Copy"
            >
              <Copy className="size-4.5" />
            </button>

            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex size-9 items-center justify-center rounded-full text-destructive hover:bg-destructive/10 active:scale-95 transition-all cursor-pointer"
              title="Delete"
            >
              <Trash2 className="size-4.5" />
            </button>
          </div>
        </header>
      ) : (
        <header className="bg-background/60 sticky top-0 z-20 flex items-center justify-between border-0 px-4 py-3 backdrop-blur-2xl">
          {/* AI Static Logo & Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative size-10 shrink-0">
              <img
                src={LEOMA_IDENTITY.avatar}
                alt="AI Agent Logo"
                className="size-10 rounded-full object-cover shadow-xs"
              />
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-background bg-emerald-500" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-bold leading-tight text-foreground">
                  {LEOMA_IDENTITY.name}
                </p>
                <img
                  src={LEOMA_IDENTITY.verifiedBadge}
                  alt="Verified"
                  className="size-3.5 shrink-0 object-contain"
                />
              </div>
              <p className="text-muted-foreground truncate text-[11px] font-medium">online</p>
            </div>
          </div>

          {/* Single Clean Settings Gear Icon Button on Top-Right - Borderless */}
          <button
            type="button"
            onClick={() => setViewMode("profile")}
            className="flex size-9 items-center justify-center rounded-full text-foreground/80 hover:text-foreground bg-secondary/50 hover:bg-secondary active:scale-95 transition-all cursor-pointer"
            title="Settings & Persona"
          >
            <Settings className="size-4.5 stroke-[2]" />
          </button>
        </header>
      )}

      {/* Messages Scroll Area with True CSS Gradient Masking / Feathered Edges */}
      <div
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
              <img src={LEOMA_IDENTITY.avatar} alt="AI Agent" className="size-full object-cover" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                Yo{profile?.display_name ? ` ${profile.display_name}` : ""}! 🔥
              </h2>
              <img
                src={LEOMA_IDENTITY.verifiedBadge}
                alt="Verified"
                className="size-5 object-contain"
              />
            </div>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-xs mx-auto">
              Say anything, ask doubts, or type below to start chatting...
            </p>
          </div>
        ) : null}

        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            isSelected={selectedIds.includes(m.id)}
            isSelectMode={isSelectMode}
            onHold={handleHoldMessage}
            onClick={handleClickMessage}
          />
        ))}

        {thinking ? <TypingBubble /> : null}
        <div ref={bottomRef} className="h-28 shrink-0 pointer-events-none" />
      </div>

      {/* Gemini Style Input Bar: Only Input & Send Button - Borderless */}
      <div className="bg-background/70 sticky bottom-0 z-20 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl">
        <div className="mx-auto max-w-3xl">
          <form
            onSubmit={send}
            className="bg-[#f0f4f9] dark:bg-[#1e1f20] focus-within:ring-1 focus-within:ring-primary/40 flex items-center gap-2 rounded-full px-4 py-1.5 transition-all"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Say anything or ask AI Agent..."
              className="w-full bg-transparent py-2.5 text-[15px] sm:text-[16px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || thinking}
              className="size-9.5 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              aria-label="Send message"
            >
              <SendHorizontal className="size-4" />
            </Button>
          </form>
          <p className="text-center text-[11px] text-muted-foreground/60 mt-1.5 select-none hidden sm:block">
            AI Agent can make mistakes. Verify important info.
          </p>
        </div>
      </div>

      {/* Delete Confirmation Modal with Delete Selected and Clear All */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="w-[88vw] max-w-[320px] rounded-3xl p-5 shadow-2xl border bg-card/95 backdrop-blur-md">
          <DialogHeader className="space-y-1.5 text-center">
            <DialogTitle className="text-base font-bold text-foreground">
              Delete Options
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Delete selected messages or clear the entire chat history?
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 pt-2.5">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteSelected}
              className="h-10 w-full rounded-2xl text-xs font-semibold shadow-xs cursor-pointer"
            >
              Delete Selected ({selectedIds.length})
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClearAllMessages}
              className="h-10 w-full rounded-2xl text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/20 cursor-pointer"
            >
              Clear All Messages
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteConfirmOpen(false)}
              className="h-9 w-full rounded-2xl text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
