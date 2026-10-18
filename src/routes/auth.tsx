import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, User } from "lucide-react";
import { LEOMA_IDENTITY } from "@/lib/constants";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "AI Agent — Get Started" },
      {
        name: "description",
        content: "Private, intelligent AI agent with local persistence.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loginLocal } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [step, setStep] = useState<"welcome" | "name">("welcome");
  const [userName, setUserName] = useState("");
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    if (session) {
      void navigate({ to: "/" });
    }
  }, [session, navigate]);

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
    loginLocal(finalName);
    void navigate({ to: "/" });
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8 bg-black">
      {/* Dynamic Animated Ambient Neutral Backdrop behind video */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[15%] size-[500px] rounded-full bg-white/5 blur-[120px]" />
        <div className="absolute top-[40%] -right-[15%] size-[500px] rounded-full bg-zinc-800/10 blur-[120px]" />
      </div>

      {/* HTML5 Video with native muted setup & crystal clear presentation */}
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
        className="absolute inset-0 size-full object-cover scale-100 pointer-events-none z-0 opacity-85 transition-opacity duration-500"
      >
        <source src={LEOMA_IDENTITY.authBackgroundVideo} type="video/mp4" />
      </video>

      {/* Subtle translucent dark glass scrim so white text has perfect contrast */}
      <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-[380px]">
        <div className="w-full rounded-3xl border border-white/20 bg-black/70 p-7 text-center text-white shadow-2xl backdrop-blur-2xl animate-fade-in">
          {/* AI Logo Image */}
          <div className="relative mx-auto size-20 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30 mb-4 bg-white/10">
            <img
              src={LEOMA_IDENTITY.avatar}
              alt="AI Agent Logo"
              className="size-full object-cover"
            />
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">{LEOMA_IDENTITY.name}</h1>
            <img
              src={LEOMA_IDENTITY.verifiedBadge}
              alt="Verified"
              className="size-5 object-contain"
            />
          </div>

          <p className="text-xs text-white/80 leading-relaxed max-w-[290px] mx-auto mb-6">
            Your private, intelligent AI companion. 100% free and saved directly on your device.
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
            <form onSubmit={handleFinishOnboarding} className="space-y-4 text-left animate-fade-in">
              <div className="space-y-1.5">
                <label
                  htmlFor="name_input"
                  className="text-xs text-white/90 font-medium px-1 flex items-center gap-1.5"
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
                  className="h-11 w-full rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-xs px-3.5 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all"
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

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-1.5 text-[11px] text-white/60">
            <ShieldCheck className="size-3.5 text-emerald-400" />
            <span>Private Local Storage • Free Forever</span>
          </div>
        </div>
      </div>
    </main>
  );
}
