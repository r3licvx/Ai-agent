import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, Plus, X, Trash2, Pencil, Check } from "lucide-react";
import type { ChatSession } from "@/lib/chatSessions";

export interface ChatSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onCreateNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
}

export function ChatSidebarDrawer({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateNewChat,
  onDeleteSession,
  onRenameSession,
}: ChatSidebarDrawerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const startRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const saveRename = (sessionId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = editTitle.trim();
    if (trimmed) {
      onRenameSession(sessionId, trimmed);
    }
    setEditingId(null);
  };

  const handleDeleteClick = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(sessionId);
  };

  const confirmDelete = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteSession(sessionId);
    setConfirmDeleteId(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (Fades In & Fades Out) */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs cursor-pointer"
            aria-hidden="true"
          />

          {/* Slide-in / Slide-out Sidebar Drawer */}
          <motion.aside
            key="drawer-content"
            initial={{ x: "-100%", opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0.9 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="fixed inset-y-0 left-0 z-50 w-[290px] sm:w-[320px] bg-background border-r border-border/80 shadow-2xl flex flex-col select-none overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 bg-background/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-foreground">All Chats</h2>
                <span className="px-2 py-0.5 rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground">
                  {sessions.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onCreateNewChat();
                    onClose();
                  }}
                  className="flex size-8 items-center justify-center rounded-full bg-secondary/80 hover:bg-secondary text-foreground active:scale-95 transition-all cursor-pointer"
                  title="New Chat"
                >
                  <Plus className="size-4 stroke-[2.2]" />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:scale-95 transition-all cursor-pointer"
                  title="Close Sidebar"
                >
                  <X className="size-4 stroke-[2]" />
                </button>
              </div>
            </div>

            {/* Clean Start New Chat Banner (No ugly extra icons) */}
            <div className="p-3">
              <button
                type="button"
                onClick={() => {
                  onCreateNewChat();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-secondary/80 hover:bg-secondary border border-border/60 text-foreground text-xs font-bold transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
              >
                <Plus className="size-4 text-primary stroke-[2.2]" />
                <span>Start New Chat</span>
              </button>
            </div>

            {/* Sessions Scroll List */}
            <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1.5 no-scrollbar">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const isEditing = editingId === session.id;
                const isConfirmingDelete = confirmDeleteId === session.id;

                return (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => {
                      if (!isEditing && !isConfirmingDelete) {
                        onSelectSession(session.id);
                        onClose();
                      }
                    }}
                    className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-2xl border transition-all cursor-pointer ${
                      isActive
                        ? "bg-secondary text-foreground border-border shadow-xs font-semibold"
                        : "bg-card/40 hover:bg-secondary/60 text-muted-foreground hover:text-foreground border-border/40"
                    }`}
                  >
                    {/* Left: Chat Icon & Title or Skeleton */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                      <MessageSquare
                        className={`size-4 shrink-0 ${
                          isActive ? "text-primary" : "text-muted-foreground/70"
                        }`}
                      />

                      {session.isGeneratingTitle ? (
                        /* AI Skeleton Title Loader */
                        <div className="space-y-1 flex-1 py-0.5">
                          <div className="h-3.5 w-24 bg-muted-foreground/25 rounded-sm animate-pulse" />
                          <div className="h-2 w-14 bg-muted-foreground/15 rounded-sm animate-pulse" />
                        </div>
                      ) : isEditing ? (
                        /* Inline Rename Form */
                        <form
                          onSubmit={(e) => saveRename(session.id, e)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 flex-1"
                        >
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full bg-background border border-primary/50 rounded-lg px-2 py-0.5 text-xs text-foreground focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="p-1 text-emerald-500 hover:text-emerald-400 cursor-pointer"
                            title="Save"
                          >
                            <Check className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Cancel"
                          >
                            <X className="size-3.5" />
                          </button>
                        </form>
                      ) : (
                        /* Standard Title Display */
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold leading-snug">
                            {session.title || "Untitled Chat"}
                          </p>
                          <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5">
                            {session.messages.length > 0
                              ? `${session.messages.length} messages`
                              : "Empty chat"}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions (Rename & Delete) */}
                    {!isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        {isConfirmingDelete ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1"
                          >
                            <button
                              type="button"
                              onClick={(e) => confirmDelete(session.id, e)}
                              className="px-2 py-0.5 rounded-lg bg-destructive text-destructive-foreground text-[10px] font-bold cursor-pointer"
                              title="Confirm Delete"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(null);
                              }}
                              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Cancel"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => startRename(session, e)}
                              className="p-1.5 rounded-lg hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title="Rename Chat"
                            >
                              <Pencil className="size-3" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteClick(session.id, e)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                              title="Delete Chat"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
