import React, { useState, useEffect } from "react";
import { Play, ExternalLink, Eye, ThumbsUp, Calendar, CheckCircle2 } from "lucide-react";
import { type YouTubeVideoDetails, getOrFetchChannelAvatar } from "@/lib/youtube";
import { YouTubeIcon } from "@/components/chat/YouTubeLogo";

export function YouTubeVideoCard({ video }: { video: YouTubeVideoDetails }) {
  const [avatarUrl, setAvatarUrl] = useState<string>(video.channelAvatarUrl || "");
  const [avatarErr, setAvatarErr] = useState(false);

  useEffect(() => {
    if (video.channelAvatarUrl) {
      setAvatarUrl(video.channelAvatarUrl);
    } else if (video.channelId) {
      getOrFetchChannelAvatar(video.channelId).then((url) => {
        if (url) setAvatarUrl(url);
      });
    }
  }, [video.channelAvatarUrl, video.channelId]);

  const watchUrl = `https://www.youtube.com/watch?v=${video.id}`;
  const channelUrl = video.channelId
    ? `https://www.youtube.com/channel/${video.channelId}`
    : watchUrl;

  const channelInitial = video.channelTitle ? video.channelTitle.charAt(0).toUpperCase() : "Y";

  return (
    <div className="my-2.5 w-full max-w-full sm:max-w-xl overflow-hidden rounded-2xl border border-border/80 bg-background/95 dark:bg-[#1a1b1e] shadow-sm hover:shadow-md transition-all text-foreground group box-border">
      {/* Top Header Tag with Real Channel Logo */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-muted/30 border-b border-border/50 text-xs min-w-0 max-w-full">
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 font-bold text-slate-900 dark:text-white hover:text-red-600 transition-colors min-w-0 max-w-[70%]"
        >
          {avatarUrl && !avatarErr ? (
            <img
              src={avatarUrl}
              alt={video.channelTitle}
              className="size-4.5 rounded-full object-cover shrink-0 border border-border/60"
            />
          ) : (
            <span className="size-4.5 rounded-full bg-red-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
              {channelInitial}
            </span>
          )}
          <span className="font-semibold text-[12.5px] tracking-tight truncate">
            {video.channelTitle || "YouTube Channel"}
          </span>
        </a>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 font-medium text-[11px] sm:text-[11.5px] text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors shrink-0"
        >
          <span>Watch</span>
          <ExternalLink className="size-3" />
        </a>
      </div>

      {/* Main Content Body */}
      <div className="flex flex-col sm:flex-row p-3 gap-3 min-w-0 max-w-full overflow-hidden">
        {/* Thumbnail with Click to Play */}
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block w-full sm:w-40 shrink-0 aspect-video rounded-xl overflow-hidden bg-black/60 border border-black/10 dark:border-white/10 group/thumb shadow-xs"
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
            <div className="size-8.5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-transform">
              <Play className="size-4 fill-current ml-0.5" />
            </div>
          </div>
          {/* Duration Badge */}
          {video.formattedDuration ? (
            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/90 text-white text-[10px] font-mono font-semibold shadow-xs">
              {video.formattedDuration}
            </div>
          ) : null}
        </a>

        {/* Details Column */}
        <div className="flex flex-col justify-between flex-1 min-w-0 max-w-full overflow-hidden">
          <div className="min-w-0 max-w-full overflow-hidden">
            {/* Video Title - Auto truncated & bounded */}
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[13px] sm:text-[14px] leading-snug line-clamp-2 break-words overflow-hidden text-ellipsis hover:text-red-600 dark:hover:text-red-400 transition-colors text-slate-950 dark:text-zinc-50 block w-full max-w-full min-w-0"
              title={video.title}
            >
              {video.title}
            </a>

            {/* Real Channel Info with Avatar and Verified Checkmark */}
            <div className="mt-2 flex items-center gap-2 min-w-0 max-w-full">
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 size-6 rounded-full overflow-hidden bg-muted border border-border/80 hover:ring-2 hover:ring-red-500/50 transition-all flex items-center justify-center text-[10px] font-bold text-foreground"
                title={`Visit ${video.channelTitle}`}
              >
                {avatarUrl && !avatarErr ? (
                  <img
                    src={avatarUrl}
                    alt={video.channelTitle}
                    onError={() => setAvatarErr(true)}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="size-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {channelInitial}
                  </span>
                )}
              </a>

              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] sm:text-[12.5px] font-semibold text-slate-800 dark:text-zinc-200 hover:text-red-600 dark:hover:text-red-400 hover:underline transition-colors truncate max-w-[140px] sm:max-w-[200px] flex items-center gap-1 min-w-0"
                title={`Visit ${video.channelTitle} on YouTube`}
              >
                <span className="truncate">{video.channelTitle}</span>
                <CheckCircle2 className="size-3 text-muted-foreground fill-current/20 shrink-0" />
              </a>
            </div>
          </div>

          {/* Statistics and Channel URL Link Pill */}
          <div className="mt-2.5 pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-1.5 min-w-0 max-w-full">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-muted-foreground font-medium">
              {video.formattedViews && video.formattedViews !== "0" && (
                <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-zinc-200">
                  <Eye className="size-3 text-muted-foreground" />
                  <span>{video.formattedViews} views</span>
                </span>
              )}

              {video.formattedLikes && video.formattedLikes !== "0" && (
                <span className="flex items-center gap-1">
                  <ThumbsUp className="size-3 text-muted-foreground" />
                  <span>{video.formattedLikes}</span>
                </span>
              )}

              {video.formattedPublishedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3 text-muted-foreground" />
                  <span>{video.formattedPublishedAt}</span>
                </span>
              )}
            </div>

            {/* Channel direct link button */}
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-red-600 dark:text-red-400 hover:underline bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded-md transition-colors shrink-0"
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
