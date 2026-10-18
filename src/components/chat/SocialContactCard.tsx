import React from "react";
import { ExternalLink, Send } from "lucide-react";

export function InstagramCard() {
  return (
    <div className="my-2.5 w-full max-w-md overflow-hidden rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-500/[0.07] via-purple-500/[0.05] to-orange-500/[0.07] dark:bg-[#18121d] p-3.5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Instagram Logo Gradient Circle */}
          <div className="size-11 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shadow-sm shrink-0">
            <svg
              className="size-6 fill-none stroke-current stroke-2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[15px] text-foreground">Umang</span>
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-600 dark:text-pink-400">
                Creator
              </span>
            </div>
            <p className="text-[12.5px] font-semibold text-pink-600 dark:text-pink-400">
              @umang.dl
            </p>
          </div>
        </div>

        <a
          href="https://instagram.com/umang.dl"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-95 active:scale-95 text-white font-bold text-xs shadow-xs transition-all shrink-0 cursor-pointer"
        >
          <span>Open Instagram</span>
          <ExternalLink className="size-3" />
        </a>
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground font-medium">
        Developer & Creator of Aarambh. Connect for latest updates and cool AI tech!
      </p>
    </div>
  );
}

export function TelegramCard() {
  return (
    <div className="my-2.5 w-full max-w-md overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/[0.08] to-blue-500/[0.04] dark:bg-[#0e1724] p-3.5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Telegram Logo Circle */}
          <div className="size-11 rounded-2xl bg-[#229ED9] flex items-center justify-center text-white shadow-sm shrink-0">
            <Send className="size-5.5 fill-white ml-[-1px] mt-[1px]" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[15px] text-foreground">Umang Support</span>
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400">
                Help
              </span>
            </div>
            <p className="text-[12.5px] font-semibold text-sky-600 dark:text-sky-400">@Umangexe</p>
          </div>
        </div>

        <a
          href="https://t.me/Umangexe"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#229ED9] hover:bg-[#1e8ec3] active:scale-95 text-white font-bold text-xs shadow-xs transition-all shrink-0 cursor-pointer"
        >
          <span>Open Telegram</span>
          <ExternalLink className="size-3" />
        </a>
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground font-medium">
        Facing an issue or need direct help? Ping on Telegram anytime!
      </p>
    </div>
  );
}
