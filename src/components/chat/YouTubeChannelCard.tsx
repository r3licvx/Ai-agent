import React, { useState } from "react";
import { ExternalLink, Users, Video, Eye, CheckCircle2 } from "lucide-react";
import { type YouTubeChannelDetails } from "@/lib/youtube";
import { YouTubeIcon } from "@/components/chat/YouTubeLogo";

export function YouTubeChannelCard({ channel }: { channel: YouTubeChannelDetails }) {
  const [avatarErr, setAvatarErr] = useState(false);
  const channelUrl = channel.url || `https://www.youtube.com/channel/${channel.id}`;

  return (
    <div className="my-3 w-full max-w-xl overflow-hidden rounded-2xl border border-border/80 bg-background/95 dark:bg-[#1a1b1e] shadow-sm hover:shadow-md transition-all text-foreground group">
      {/* Top Header Tag */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-red-500/[0.04] dark:bg-red-500/[0.08] border-b border-border/50 text-xs">
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 font-bold text-slate-900 dark:text-white hover:text-red-600 transition-colors"
        >
          <YouTubeIcon className="h-4 w-6 shrink-0 drop-shadow-2xs" />
          <span className="font-semibold text-[13px] tracking-tight">YouTube Channel</span>
        </a>
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 font-medium text-[11.5px] text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <span>Open on YouTube</span>
          <ExternalLink className="size-3" />
        </a>
      </div>

      {/* Main Channel Info */}
      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Large Round Avatar */}
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative size-16 sm:size-18 rounded-full overflow-hidden shrink-0 border-2 border-red-500/30 group-hover:border-red-600 shadow-sm transition-all bg-muted flex items-center justify-center"
          title={`Visit ${channel.title}`}
        >
          {channel.avatarUrl && !avatarErr ? (
            <img
              src={channel.avatarUrl}
              alt={channel.title}
              onError={() => setAvatarErr(true)}
              className="size-full object-cover group-hover:scale-105 transition-transform"
              loading="lazy"
            />
          ) : (
            <div className="size-full bg-red-600 flex items-center justify-center text-white font-bold text-2xl">
              {channel.title.charAt(0).toUpperCase()}
            </div>
          )}
        </a>

        {/* Channel Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[16px] sm:text-[17px] text-slate-950 dark:text-zinc-50 hover:text-red-600 dark:hover:text-red-400 transition-colors truncate"
            >
              {channel.title}
            </a>
            <CheckCircle2 className="size-4 text-red-600 fill-current/20 shrink-0" />
          </div>

          {channel.customUrl && (
            <p className="text-[12.5px] font-semibold text-muted-foreground/90 mt-0.5">
              {channel.customUrl}
            </p>
          )}

          {/* Stats Bar */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12px] font-medium text-slate-700 dark:text-zinc-300">
            {channel.formattedSubscribers && channel.formattedSubscribers !== "0" && (
              <span className="flex items-center gap-1 font-bold text-slate-900 dark:text-zinc-100">
                <Users className="size-3.5 text-red-600" />
                <span>{channel.formattedSubscribers} subscribers</span>
              </span>
            )}

            {channel.videoCount && channel.videoCount !== "0" && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Video className="size-3.5" />
                <span>{channel.videoCount} videos</span>
              </span>
            )}

            {channel.formattedViews && channel.formattedViews !== "0" && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Eye className="size-3.5" />
                <span>{channel.formattedViews} views</span>
              </span>
            )}
          </div>
        </div>

        {/* Subscribe / Visit Button */}
        <div className="sm:self-center shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <span>Subscribe</span>
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
