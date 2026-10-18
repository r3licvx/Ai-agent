import { useState, useEffect } from "react";
import { toast } from "sonner";
import { LogOut, ArrowLeft, Check, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AGENT_MODELS, LEOMA_IDENTITY } from "@/lib/constants";

export function ProfileView({
  onBack,
  onClearMessages,
}: {
  onBack: () => void;
  onClearMessages?: () => void;
}) {
  const { profile, updateProfile, signOut } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-4-argon");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setSelectedModel(profile.selected_model || "gemini-4-argon");
    }
  }, [profile]);

  const handleNameBlur = async () => {
    const cleanName = displayName.trim() || "Bro";
    if (cleanName === profile?.display_name) return;
    try {
      await updateProfile({
        display_name: cleanName,
        selected_model: selectedModel,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      toast.success("Name updated!");
    } catch {
      toast.error("Failed to update name");
    }
  };

  const handleSelectModel = async (modelId: string, modelName: string) => {
    setSelectedModel(modelId);
    try {
      await updateProfile({
        display_name: displayName.trim() || "Bro",
        selected_model: modelId,
      });
      toast.success(`Active model: ${modelName}`);
    } catch {
      // ignore
    }
  };

  return (
    <div className="no-scrollbar flex h-dvh flex-col bg-background animate-fade-in overflow-y-auto">
      {/* Top Header - Ultra Clean & Borderless */}
      <header className="bg-background/80 sticky top-0 z-20 flex items-center justify-between px-5 py-3.5 backdrop-blur-2xl">
        <button
          type="button"
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-full bg-secondary/60 hover:bg-secondary active:scale-90 transition-all text-foreground cursor-pointer"
          title="Back to chat"
        >
          <ArrowLeft className="size-4.5" />
        </button>

        <h1 className="text-sm font-semibold tracking-wide text-foreground/90 select-none">
          Preferences
        </h1>

        <div className="size-9" />
      </header>

      {/* Main Settings Canvas - No Scrollbar */}
      <main
        className="no-scrollbar mx-auto w-full max-w-sm flex-1 space-y-7 px-5 py-6 pb-16 overflow-y-auto"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 20px, black calc(100% - 24px), transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 20px, black calc(100% - 24px), transparent 100%)",
        }}
      >
        {/* Profile Avatar & Identity */}
        <div className="flex flex-col items-center justify-center text-center select-none pt-2">
          <div className="relative size-20 rounded-full overflow-hidden shadow-sm mb-3">
            <img src={LEOMA_IDENTITY.avatar} alt="AI Agent" className="size-full object-cover" />
          </div>

          <div className="flex items-center justify-center gap-1.5">
            <h2 className="text-base font-bold text-foreground">{LEOMA_IDENTITY.name}</h2>
            <img
              src={LEOMA_IDENTITY.verifiedBadge}
              alt="Verified"
              className="size-4 object-contain"
            />
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">Your Private AI Companion</p>
        </div>

        {/* Display Name Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted-foreground">Your Name</span>
            {isSaved && (
              <span className="text-[11px] font-medium text-emerald-500 animate-fade-in flex items-center gap-1">
                <Check className="size-3" /> Saved
              </span>
            )}
          </div>

          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            placeholder="What should I call you?"
            className="w-full rounded-2xl bg-[#f0f4f9] dark:bg-[#1e1f20] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
          />
        </div>

        {/* AI Model Selection */}
        <div className="space-y-2.5">
          <div className="px-1 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active AI Model</span>
            <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
              <Sparkles className="size-3" /> Tap to switch
            </span>
          </div>

          <div className="space-y-1.5">
            {AGENT_MODELS.map((m) => {
              const isSelected = selectedModel === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectModel(m.id, m.name)}
                  className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 text-primary font-medium"
                      : "bg-[#f0f4f9]/70 dark:bg-[#1e1f20]/70 hover:bg-[#f0f4f9] dark:hover:bg-[#1e1f20] text-foreground/80"
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-foreground">{m.name}</span>
                      <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-semibold">
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      {m.description}
                    </p>
                  </div>

                  {isSelected && <Check className="size-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Minimalist Log Out Action */}
        <div className="pt-4 flex justify-center">
          <button
            type="button"
            onClick={async () => {
              if (typeof window !== "undefined") {
                localStorage.clear();
                sessionStorage.clear();
              }
              if (onClearMessages) onClearMessages();
              await signOut();
              toast.success("Logged out");
              if (typeof window !== "undefined") {
                window.location.href = "/auth";
              }
            }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive active:scale-95 transition-all cursor-pointer py-2 px-3 rounded-full hover:bg-destructive/10"
          >
            <LogOut className="size-3.5" />
            <span>Reset & Log out</span>
          </button>
        </div>
      </main>
    </div>
  );
}
