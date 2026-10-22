import type { SVGProps } from "react";

export function GeminiStar({
  className = "size-12",
  ...props
}: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Subtle soft backdrop bloom */}
      <div className="absolute inset-0 size-14 -translate-x-1 -translate-y-1 rounded-full bg-gradient-to-tr from-sky-400/20 via-blue-500/20 to-purple-500/20 blur-xl animate-pulse" />

      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`relative ${className} drop-shadow-[0_2px_8px_rgba(59,130,246,0.35)] transition-transform duration-300 hover:scale-110`}
        {...props}
      >
        <defs>
          <linearGradient id="gemini-rgb" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a73e8" />
            <stop offset="28%" stopColor="#24c6dc" />
            <stop offset="65%" stopColor="#8a2be2" />
            <stop offset="85%" stopColor="#ff4081" />
            <stop offset="100%" stopColor="#ffab00" />
          </linearGradient>
          <linearGradient id="gemini-rgb-shine" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 4-point Astroid / Star path */}
        <path
          d="M12 1.5C12 7.29899 7.29899 12 1.5 12C7.29899 12 12 16.701 12 22.5C12 16.701 16.701 12 22.5 12C16.701 12 12 7.29899 12 1.5Z"
          fill="url(#gemini-rgb)"
        />
        {/* Subtle highlight overlay */}
        <path
          d="M12 1.5C12 7.29899 7.29899 12 1.5 12C7.29899 12 12 16.701 12 22.5C12 16.701 16.701 12 22.5 12C16.701 12 12 7.29899 12 1.5Z"
          fill="url(#gemini-rgb-shine)"
        />
      </svg>
    </div>
  );
}
