import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
    color: "text-red-400",
  },
  {
    icon: Calculator,
    text: "100% accurate step-by-step math calculations",
    color: "text-amber-400",
  },
  {
    icon: MessageSquare,
    text: "Unfiltered Gen Z backbencher roasts & advice",
    color: "text-purple-400",
  },
  {
    icon: ShieldCheck,
    text: "Zero tracking • 100% private local storage",
    color: "text-emerald-400",
  },
  {
    icon: Zap,
    text: "Ultra-fast response with deep reasoning",
    color: "text-sky-400",
  },
];

function AuthPage() {
  const navigate = useNavigate();
  const { session, loginLocal } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [step, setStep] = useState<"welcome" | "name">("welcome");
  const [userName, setUserName] = useState("");
  const [, setVideoLoaded] = useState(false);

  // Dynamic Rotating Capabilities Ticker
  const [capabilityIdx, setCapabilityIdx] = useState(0);

  // Profile creation simple spinner state
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (session && !isCreating) {
      void navigate({ to: "/" });
    }
  }, [session, isCreating, navigate]);

  // Capability ticker auto-rotation every 2.5s
  useEffect(() => {
    const timer = setInterval(() => {
      setCapabilityIdx((prev) => (prev + 1) % CAPABILITIES.length);
    }, 2600);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    const tryPlay = () => {
      video
        .play()
        .then(() => setVideoLoaded(true))
        .catch(() => {
          // Autoplay policy might await user interaction
        });
    };

    tryPlay();

    const handleUserGesture = () => {
      if (video.paused) {
        void video.play().then(() => setVideoLoaded(true));
      }
    };

    window.addEventListener("click", handleUserGesture, { once: true });
    window.addEventListener("touchstart", handleUserGesture, { once: true });

    return () => {
      window.removeEventListener("click", handleUserGesture);
      window.removeEventListener("touchstart", handleUserGesture);
    };
  }, []);

  const handleStartName = () => {
    setStep("name");
  };

  const handleFinishOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = userName.trim() || "Bro";

    // Clean, quick spinner without extra bloat
    setIsCreating(true);

    setTimeout(() => {
      loginLocal(finalName);
      void navigate({ to: "/" });
    }, 750);
  };

  const currentCap = CAPABILITIES[capabilityIdx] ?? CAPABILITIES[0]!;
  const CurrentCapIcon = currentCap.icon;

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8 bg-black">
      {/* HTML5 Video Backdrop */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onLoadedData={() => setVideoLoaded(true)}
        onCanPlay={() => setVideoLoaded(true)}
        onPlaying={() => setVideoLoaded(true)}
        className="absolute inset-0 size-full object-cover scale-100 pointer-events-none z-0 opacity-80 transition-opacity duration-500"
      >
        <source src={LEOMA_IDENTITY.authBackgroundVideo} type="video/mp4" />
      </video>

      {/* Dark scrim for crisp text contrast */}
      <div className="absolute inset-0 bg-black/50 z-0 pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-[390px]">
        <div className="w-full rounded-3xl border border-white/20 bg-black/75 p-7 text-center text-white shadow-2xl backdrop-blur-2xl transition-all">
          {/* Creation Sequence View: Clean Minimalist Spinner */}
          {isCreating ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 animate-in fade-in duration-200">
              <Loader2 className="size-8 text-white animate-spin stroke-[2.2]" />
            </div>
          ) : (
            <>
              {/* AI Logo Image */}
              <div className="relative mx-auto size-20 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30 mb-4 bg-white/10">
                <img
                  src={LEOMA_IDENTITY.avatar}
                  alt="AARAMB Logo"
                  className="size-full object-cover"
                />
              </div>

              {/* Title: Normal Crisp White Text, No Gradient, No Verified Badge */}
              <div className="flex items-center justify-center mb-1">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {LEOMA_IDENTITY.name}
                </h1>
              </div>

              {/* Dynamic Welcome Greeting as user types */}
              <p className="text-xs text-white/85 leading-relaxed max-w-[300px] mx-auto mb-6 font-medium">
                {step === "name" && userName.trim()
                  ? `Welcome, ${userName.trim()}! Ready to chat?`
                  : "Your private, intelligent AI companion. 100% free and saved directly on your device."}
              </p>

              {step === "welcome" ? (
                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={handleStartName}
                    className="h-12 w-full rounded-2xl bg-white text-black font-bold text-sm shadow-xl hover:bg-white/90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={handleFinishOnboarding}
                  className="space-y-4 text-left animate-in fade-in duration-200"
                >
                  <div className="space-y-1.5">
                    <label
                      htmlFor="name_input"
                      className="text-xs text-white/90 font-semibold px-1 flex items-center gap-1.5"
                    >
                      <User className="size-3.5 text-white/80" />
                      What should I call you?
                    </label>
                    <input
                      id="name_input"
                      type="text"
                      required
                      autoFocus
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Enter your name..."
                      className="h-11 w-full rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-xs px-3.5 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all font-medium"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-2xl bg-white text-black font-bold text-sm shadow-xl hover:bg-white/90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Start Chatting</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </form>
              )}

              {/* Dynamic Rotating Capabilities Ticker */}
              <div className="mt-6 pt-4 border-t border-white/10 min-h-[40px] flex items-center justify-center">
                <div
                  key={capabilityIdx}
                  className="flex items-center justify-center gap-2 text-[11.5px] font-medium text-white/80 animate-in fade-in slide-in-from-bottom-1 duration-300"
                >
                  <CurrentCapIcon className={`size-4 shrink-0 ${currentCap.color}`} />
                  <span className="truncate max-w-[280px]">{currentCap.text}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
