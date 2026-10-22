import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ShieldCheck,
  User,
  Youtube,
  Calculator,
  MessageSquare,
  Zap,
  Loader2,
} from "lucide-react";
import { LEOMA_IDENTITY } from "@/lib/constants";
import { validateDisplayNameWithAI } from "@/lib/ai.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Aarambh — Get Started" },
      {
        name: "description",
        content: "Private, intelligent AI companion with local persistence.",
      },
    ],
  }),
  component: AuthPage,
});

const CAPABILITIES = [
  {
    icon: Youtube,
    text: "Instant YouTube video & channel details",
    color: "text-red-500",
  },
  {
    icon: Calculator,
    text: "100% accurate step-by-step math calculations",
    color: "text-amber-500",
  },
  {
    icon: MessageSquare,
    text: "Unfiltered Gen Z backbencher roasts & advice",
    color: "text-purple-500",
  },
  {
    icon: ShieldCheck,
    text: "Zero tracking • 100% private local storage",
    color: "text-emerald-500",
  },
  {
    icon: Zap,
    text: "Ultra-fast response with deep reasoning",
    color: "text-sky-500",
  },
];

function AuthPage() {
  const navigate = useNavigate();
  const { session, loginLocal } = useAuth();

  const [step, setStep] = useState<"welcome" | "name">("welcome");
  const [userName, setUserName] = useState("");

  // Dynamic Rotating Capabilities Ticker
  const [capabilityIdx, setCapabilityIdx] = useState(0);

  // Profile creation simple spinner state
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (session && !isCreating) {
      void navigate({ to: "/" });
    }
  }, [session, isCreating, navigate]);

  // Capability ticker auto-rotation every 2.6s
  useEffect(() => {
    const timer = setInterval(() => {
      setCapabilityIdx((prev) => (prev + 1) % CAPABILITIES.length);
    }, 2600);
    return () => clearInterval(timer);
  }, []);

  const handleStartName = () => {
    setStep("name");
  };

  const [isValidating, setIsValidating] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleFinishOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    const rawName = userName.trim();

    if (!rawName) {
      setNameError("Please enter your real name.");
      return;
    }

    setIsValidating(true);

    try {
      const res = await validateDisplayNameWithAI({ data: { name: rawName } });
      setIsValidating(false);

      if (!res.isValid) {
        setNameError(res.reason || "Please enter a valid real name (e.g. Rahul, Sameer, Alex).");
        toast.error(res.reason || "Invalid name entered");
        return;
      }

      const cleanName = res.cleanName || rawName;
      setIsCreating(true);

      setTimeout(() => {
        loginLocal(cleanName);
        void navigate({ to: "/" });
      }, 500);
    } catch {
      setIsValidating(false);
      if (/[,/\\@#$%*+=<>?!_{}[\]~^;:|"]/.test(rawName) || rawName.length < 2) {
        setNameError("Symbols or punctuation are not allowed. Please enter a real name.");
        toast.error("Please enter a valid real name");
        return;
      }

      setIsCreating(true);
      setTimeout(() => {
        loginLocal(rawName);
        void navigate({ to: "/" });
      }, 500);
    }
  };

  const currentCap = CAPABILITIES[capabilityIdx] ?? CAPABILITIES[0]!;
  const CurrentCapIcon = currentCap.icon;

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-background px-4 py-8 select-none">
      {/* Main Clean Light Card */}
      <div className="relative z-10 w-full max-w-[430px]">
        <div className="w-full rounded-3xl border border-border/80 bg-card p-8 sm:p-9 text-center text-card-foreground shadow-xl backdrop-blur-xl transition-all">
          {/* Creation Sequence View: Clean Minimalist Spinner */}
          {isCreating ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 animate-in fade-in duration-200">
              <Loader2 className="size-9 text-primary animate-spin stroke-[2.2]" />
            </div>
          ) : (
            <>
              {/* AI Logo Image */}
              <div className="relative mx-auto size-24 rounded-2xl overflow-hidden shadow-md border border-border/60 mb-5 bg-secondary">
                <img
                  src={LEOMA_IDENTITY.avatar}
                  alt="AARAMBH Logo"
                  className="size-full object-cover"
                />
              </div>

              {/* Title */}
              <div className="flex items-center justify-center mb-1.5">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                  {LEOMA_IDENTITY.name}
                </h1>
              </div>

              {/* Dynamic Welcome Greeting as user types */}
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-[340px] mx-auto mb-6 font-medium">
                {step === "name" && userName.trim()
                  ? `Welcome, ${userName.trim()}! Ready to chat?`
                  : "Your private, intelligent AI companion. 100% free and saved directly on your device."}
              </p>

              {step === "welcome" ? (
                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={handleStartName}
                    className="h-13 w-full rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-sm hover:bg-primary/90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="size-5" />
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={handleFinishOnboarding}
                  className="space-y-4 text-left animate-in fade-in duration-200"
                >
                  <div className="space-y-2">
                    <label
                      htmlFor="name_input"
                      className="text-sm text-foreground font-semibold px-1 flex items-center gap-2"
                    >
                      <User className="size-4 text-primary" />
                      What should I call you?
                    </label>
                    <input
                      id="name_input"
                      type="text"
                      required
                      autoFocus
                      value={userName}
                      onChange={(e) => {
                        setUserName(e.target.value);
                        if (nameError) setNameError(null);
                      }}
                      placeholder="Enter your name..."
                      className={`h-13 w-full rounded-2xl bg-secondary/80 border text-foreground placeholder:text-muted-foreground/60 text-base px-4 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-medium ${
                        nameError
                          ? "border-destructive ring-1 ring-destructive/50"
                          : "border-border"
                      }`}
                    />
                    {nameError && (
                      <p className="text-xs text-destructive font-semibold px-1.5 pt-0.5 animate-in fade-in">
                        {nameError}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isValidating}
                    className="h-13 w-full rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-sm hover:bg-primary/90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="size-5 animate-spin" />
                        <span>Validating Name...</span>
                      </>
                    ) : (
                      <>
                        <span>Start Chatting</span>
                        <ArrowRight className="size-5" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* Dynamic Rotating Capabilities Ticker */}
              <div className="mt-6 pt-4 border-t border-border/60 min-h-[44px] flex items-center justify-center">
                <div
                  key={capabilityIdx}
                  className="flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-300"
                >
                  <CurrentCapIcon className={`size-4.5 shrink-0 ${currentCap.color}`} />
                  <span className="truncate max-w-[300px]">{currentCap.text}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
