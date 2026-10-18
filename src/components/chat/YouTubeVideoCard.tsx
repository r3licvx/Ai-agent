import React, { useState } from "react";
import { Play, ExternalLink, Eye, ThumbsUp, Calendar, CheckCircle2 } from "lucide-react";
import { type YouTubeVideoDetails } from "@/lib/youtube";
import { YouTubeIcon } from "@/components/chat/YouTubeLogo";

export function YouTubeVideoCard({ video }: { video: YouTubeVideoDetails }) {
  const [avatarErr, setAvatarErr] = useState(false);
  const watchUrl = `https://www.youtube.com/watch?v=${video.id}`;
  const channelUrl = video.channelId
    ? `https://www.youtube.com/channel/${video.channelId}`
    : watchUrl;

  return (
    <div className="my-3 w-full max-w-xl overflow-hidden rounded-2xl border border-border/80 bg-background/95 dark:bg-[#1a1b1e] shadow-sm hover:shadow-md transition-all text-foreground group">
      {/* Top Header Tag with Official YouTube Branding */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-red-500/[0.04] dark:bg-red-500/[0.08] border-b border-border/50 text-xs">
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 font-bold text-slate-900 dark:text-white hover:text-red-600 transition-colors"
        >
          <YouTubeIcon className="h-4 w-6 shrink-0 drop-shadow-2xs" />
          <span className="font-semibold text-[13px] tracking-tight">YouTube</span>
        </a>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 font-medium text-[11.5px] text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <span>Watch on YouTube</span>
          <ExternalLink className="size-3" />
        </a>
      </div>

      {/* Main Content Body */}
      <div className="flex flex-col sm:flex-row p-3.5 gap-3.5">
        {/* Thumbnail with Click to Play */}
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block w-full sm:w-44 shrink-0 aspect-video rounded-xl overflow-hidden bg-black/60 border border-black/10 dark:border-white/10 group/thumb shadow-xs"
          title={`Watch "${video.title}" on YouTube`}
        >
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {/* Play Button Overlay */}
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-90 group-hover/thumb:opacity-100 group-hover/thumb:bg-black/35 transition-all">
            <div className="size-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-transform">
              <Play className="size-5 fill-current ml-0.5" />
            </div>
          </div>
          {/* Duration Badge */}
          {video.formattedDuration ? (
            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/90 text-white text-[11px] font-mono font-semibold shadow-xs">
              {video.formattedDuration}
            </div>
          ) : null}
        </a>

        {/* Details Column */}
        <div className="flex flex-col justify-between flex-1 min-w-0">
          <div>
            {/* Video Title */}
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[15px] sm:text-[15.5px] leading-snug line-clamp-2 hover:text-red-600 dark:hover:text-red-400 transition-colors text-slate-950 dark:text-zinc-50"
              title={video.title}
            >
              {video.title}
            </a>

            {/* Real Channel Info with Avatar and Verified Checkmark */}
            <div className="mt-2 flex items-center gap-2">
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 size-6 rounded-full overflow-hidden bg-red-100 dark:bg-zinc-800 border border-border/80 hover:ring-2 hover:ring-red-500/50 transition-all flex items-center justify-center"
                title={`Visit ${video.channelTitle}`}
              >
                {video.channelAvatarUrl && !avatarErr ? (
                  <img
                    src={video.channelAvatarUrl}
                    alt={video.channelTitle}
                    onError={() => setAvatarErr(true)}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <YouTubeIcon className="size-3.5" />
                )}
              </a>

              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-semibold text-slate-800 dark:text-zinc-200 hover:text-red-600 dark:hover:text-red-400 hover:underline transition-colors truncate flex items-center gap-1"
                title={`Visit ${video.channelTitle} on YouTube`}
              >
                <span>{video.channelTitle}</span>
                <CheckCircle2 className="size-3 text-muted-foreground fill-current/20 shrink-0" />
              </a>
            </div>
          </div>

          {/* Statistics and Channel URL Link Pill */}
          <div className="mt-3 pt-2.5 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground font-medium">
              {video.formattedViews && video.formattedViews !== "0" && (
                <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-zinc-200">
                  <Eye className="size-3.5 text-muted-foreground" />
                  <span>{video.formattedViews} views</span>
                </span>
              )}

              {video.formattedLikes && video.formattedLikes !== "0" && (
                <span className="flex items-center gap-1">
                  <ThumbsUp className="size-3.5 text-muted-foreground" />
                  <span>{video.formattedLikes}</span>
                </span>
              )}

              {video.formattedPublishedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  <span>{video.formattedPublishedAt}</span>
                </span>
              )}
            </div>

            {/* Channel direct link button */}
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded-md transition-colors"
            >
              <span>Visit Channel</span>
              <ExternalLink className="size-2.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
