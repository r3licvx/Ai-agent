import React, { useRef, useState, useMemo, useEffect } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { LEOMA_IDENTITY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  extractYouTubeVideos,
  extractYouTubeChannels,
  fetchYouTubeVideoDetails,
  fetchYouTubeChannelDetails,
  getYouTubeVideoId,
  getYouTubeChannelKey,
  isYouTubeVideoUrl,
  isYouTubeChannelUrl,
  type YouTubeVideoDetails,
  type YouTubeChannelDetails,
} from "@/lib/youtube";
import { YouTubeVideoCard } from "@/components/chat/YouTubeVideoCard";
import { YouTubeChannelCard } from "@/components/chat/YouTubeChannelCard";
import { YouTubeIcon } from "@/components/chat/YouTubeLogo";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  isStreaming?: boolean;
};

function formatMathSymbols(text: string): string {
  let str = text;
  // Convert fractions \frac{a}{b} -> (a / b)
  str = str.replace(/\\d?frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1 / $2)");
  // Convert square roots \sqrt{x} -> √(x)
  str = str.replace(/\\sqrt\{([^{}]+)\}/g, "√($1)");
  str = str.replace(/\\sqrt\[([^{}]+)\]\{([^{}]+)\}/g, "$1√($2)");
  // Common math symbols
  str = str.replace(/\\times\b/g, "×");
  str = str.replace(/\\cdot\b/g, "·");
  str = str.replace(/\\div\b/g, "÷");
  str = str.replace(/\\pm\b/g, "±");
  str = str.replace(/\\approx\b/g, "≈");
  str = str.replace(/\\neq\b/g, "≠");
  str = str.replace(/\\leq\b/g, "≤");
  str = str.replace(/\\geq\b/g, "≥");
  str = str.replace(/\\infty\b/g, "∞");
  str = str.replace(/\\pi\b/g, "π");
  str = str.replace(/\\theta\b/g, "θ");
  str = str.replace(/\\alpha\b/g, "α");
  str = str.replace(/\\beta\b/g, "β");
  str = str.replace(/\\Delta\b/g, "Δ");
  str = str.replace(/\\sum\b/g, "∑");
  str = str.replace(/\\int\b/g, "∫");
  str = str.replace(/\\quad\b/g, "   ");
  str = str.replace(/\\qquad\b/g, "      ");
  str = str.replace(/\\text\{([^{}]+)\}/g, "$1");
  str = str.replace(/\\mathbf\{([^{}]+)\}/g, "$1");
  str = str.replace(/\\mathit\{([^{}]+)\}/g, "$1");
  // Powers & superscripts
  str = str.replace(/\^2\b|\^\{2\}/g, "²");
  str = str.replace(/\^3\b|\^\{3\}/g, "³");
  str = str.replace(/\^0\b|\^\{0\}/g, "⁰");
  str = str.replace(/\^1\b|\^\{1\}/g, "¹");
  str = str.replace(/\^n\b|\^\{n\}/g, "ⁿ");
  str = str.replace(/\^x\b|\^\{x\}/g, "ˣ");
  return str;
}

// Custom High-Readability Gemini-Style Markdown Formatter
function MarkdownContent({
  content,
  videoMap,
  channelMap,
}: {
  content: string;
  videoMap?: Record<string, YouTubeVideoDetails>;
  channelMap?: Record<string, YouTubeChannelDetails>;
}) {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const handleCopyCode = (codeText: string, idx: number) => {
    void navigator.clipboard?.writeText(codeText);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const elements = useMemo(() => {
    // Sanitize broken markdown links and remove any hallucinated googleusercontent links
    const cleanContent = content
      .replace(/https?:\/\/googleusercontent\.com\/[^\s)]+/gi, "")
      .replace(/\[([^\]]+)\]\s*\n\s*\((https?:\/\/[^\s)]+)\)/g, "[$1]($2)");

    const lines = cleanContent.split("\n");
    const parsedElements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLanguage = "";
    let codeBlockIdx = 0;

    const renderInline = (str: string): React.ReactNode => {
      const cleanStr = formatMathSymbols(str);
      const tokens: React.ReactNode[] = [];

      // Regex matches:
      // 1. Markdown link: [Title](url)
      // 2. Bold: **text**
      // 3. Inline code: `code`
      // 4. Inline math: $math$
      // 5. Italic: *italic*
      // 6. YouTube video URL
      // 7. YouTube channel URL
      // 8. General URL
      const regex =
        /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*.*?\*\*|`.*?`|\$[^$]+?\$|\*[^\s*][^*]*[^\s*]\*|(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^\s]*&)?v=|shorts\/|embed\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}(?:[^\s<>"')]*)|(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/(?:channel\/UC[a-zA-Z0-9_-]{22}|@[a-zA-Z0-9_.-]+|c\/[a-zA-Z0-9_.-]+)(?:[^\s<>"')]*)|https?:\/\/[^\s<>"')]+)/g;

      let lastIdx = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(cleanStr)) !== null) {
        if (match.index > lastIdx) {
          tokens.push(cleanStr.substring(lastIdx, match.index));
        }
        const token = match[0];

        // 1. Markdown link [label](url)
        if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
          const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
          if (linkMatch) {
            const label = linkMatch[1];
            const targetUrl = linkMatch[2];

            // If it's a YouTube video
            if (isYouTubeVideoUrl(targetUrl)) {
              const videoId = getYouTubeVideoId(targetUrl);
              const video = videoId && videoMap ? videoMap[videoId] : undefined;
              const displayTitle = video?.title || label || "YouTube Video";

              tokens.push(
                <a
                  key={match.index}
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mx-0.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-[13.5px] transition-all border border-red-500/25 hover:border-red-500/40 align-middle shadow-2xs group/yt no-underline"
                  title={`Watch "${displayTitle}" on YouTube`}
                >
                  <YouTubeIcon className="h-3.5 w-5 shrink-0 drop-shadow-2xs" />
                  <span className="underline decoration-red-500/40 group-hover/yt:decoration-red-500 font-bold max-w-[280px] sm:max-w-[420px] truncate">
                    {displayTitle}
                  </span>
                  <ExternalLink className="size-3 text-red-500/80 shrink-0 opacity-80 group-hover/yt:opacity-100" />
                </a>,
              );
              lastIdx = regex.lastIndex;
              continue;
            }

            // If it's a YouTube channel
            if (isYouTubeChannelUrl(targetUrl)) {
              const chInfo = getYouTubeChannelKey(targetUrl);
              const key = chInfo?.key.toLowerCase();
              const channel = key && channelMap ? channelMap[key] : undefined;
              const displayTitle = channel?.title || label || "YouTube Channel";

              tokens.push(
                <a
                  key={match.index}
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mx-0.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-[13.5px] transition-all border border-red-500/25 hover:border-red-500/40 align-middle shadow-2xs group/yt no-underline"
                  title={`Visit "${displayTitle}" on YouTube`}
                >
                  <YouTubeIcon className="h-3.5 w-5 shrink-0 drop-shadow-2xs" />
                  <span className="underline decoration-red-500/40 group-hover/yt:decoration-red-500 font-bold max-w-[280px] sm:max-w-[420px] truncate">
                    {displayTitle}
                  </span>
                  <ExternalLink className="size-3 text-red-500/80 shrink-0 opacity-80 group-hover/yt:opacity-100" />
                </a>,
              );
              lastIdx = regex.lastIndex;
              continue;
            }

            // General link
            tokens.push(
              <a
                key={match.index}
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-[13.5px] underline transition-colors"
              >
                <span>{label}</span>
                <ExternalLink className="size-3 shrink-0" />
              </a>,
            );
            lastIdx = regex.lastIndex;
            continue;
          }
        }

        // 2. Bold text
        if (token.startsWith("**") && token.endsWith("**")) {
          tokens.push(
            <strong
              key={match.index}
              className="font-bold text-slate-950 dark:text-white drop-shadow-2xs"
            >
              {token.slice(2, -2)}
            </strong>,
          );
        } else if (token.startsWith("`") && token.endsWith("`")) {
          tokens.push(
            <code
              key={match.index}
              className="rounded-md bg-black/[0.08] dark:bg-white/[0.12] text-indigo-600 dark:text-indigo-400 font-mono text-[13.5px] px-1.5 py-0.5 font-bold"
            >
              {token.slice(1, -1)}
            </code>,
          );
        } else if (token.startsWith("$") && token.endsWith("$")) {
          tokens.push(
            <span
              key={match.index}
              className="font-mono text-[14px] font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded-md"
            >
              {token.slice(1, -1)}
            </span>,
          );
        } else if (token.startsWith("*") && token.endsWith("*") && !/[-+*/=0-9÷×±√^]/.test(token)) {
          tokens.push(
            <em key={match.index} className="italic text-slate-900 dark:text-zinc-100 font-medium">
              {token.slice(1, -1)}
            </em>,
          );
        } else if (isYouTubeVideoUrl(token)) {
          const videoId = getYouTubeVideoId(token);
          const trailingMatch = token.match(/[.,!?:;)"']+$/);
          const trailingPunct = trailingMatch ? trailingMatch[0] : "";
          const video = videoId && videoMap ? videoMap[videoId] : undefined;
          const displayTitle = video?.title || "YouTube Video";

          tokens.push(
            <span key={match.index} className="inline-flex items-center align-baseline">
              <a
                href={videoId ? `https://www.youtube.com/watch?v=${videoId}` : token}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mx-0.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-[13.5px] transition-all border border-red-500/25 hover:border-red-500/40 align-middle shadow-2xs group/yt no-underline"
                title={video?.title ? `Watch "${video.title}" on YouTube` : "Watch on YouTube"}
              >
                <YouTubeIcon className="h-3.5 w-5 shrink-0 drop-shadow-2xs" />
                <span className="underline decoration-red-500/40 group-hover/yt:decoration-red-500 font-bold max-w-[280px] sm:max-w-[420px] truncate">
                  {displayTitle}
                </span>
                <ExternalLink className="size-3 text-red-500/80 shrink-0 opacity-80 group-hover/yt:opacity-100" />
              </a>
              {trailingPunct ? <span>{trailingPunct}</span> : null}
            </span>,
          );
        } else if (isYouTubeChannelUrl(token)) {
          const chInfo = getYouTubeChannelKey(token);
          const trailingMatch = token.match(/[.,!?:;)"']+$/);
          const trailingPunct = trailingMatch ? trailingMatch[0] : "";
          const key = chInfo?.key.toLowerCase();
          const channel = key && channelMap ? channelMap[key] : undefined;
          const displayTitle =
            channel?.title || (chInfo?.isHandle ? `@${chInfo.key}` : "YouTube Channel");

          tokens.push(
            <span key={match.index} className="inline-flex items-center align-baseline">
              <a
                href={
                  channel?.url ||
                  (chInfo?.isHandle
                    ? `https://www.youtube.com/@${chInfo.key}`
                    : `https://www.youtube.com/channel/${chInfo?.key}`)
                }
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mx-0.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-[13.5px] transition-all border border-red-500/25 hover:border-red-500/40 align-middle shadow-2xs group/yt no-underline"
                title={`Visit "${displayTitle}" channel on YouTube`}
              >
                <YouTubeIcon className="h-3.5 w-5 shrink-0 drop-shadow-2xs" />
                <span className="underline decoration-red-500/40 group-hover/yt:decoration-red-500 font-bold max-w-[280px] sm:max-w-[420px] truncate">
                  {displayTitle}
                </span>
                <ExternalLink className="size-3 text-red-500/80 shrink-0 opacity-80 group-hover/yt:opacity-100" />
              </a>
              {trailingPunct ? <span>{trailingPunct}</span> : null}
            </span>,
          );
        } else if (token.startsWith("http://") || token.startsWith("https://")) {
          const trailingMatch = token.match(/[.,!?:;)"']+$/);
          const trailingPunct = trailingMatch ? trailingMatch[0] : "";
          const cleanUrl = trailingPunct ? token.slice(0, -trailingPunct.length) : token;

          tokens.push(
            <span key={match.index} className="inline-flex items-center align-baseline">
              <a
                href={cleanUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-[13px] underline transition-colors"
              >
                <span className="max-w-[260px] truncate">{cleanUrl}</span>
                <ExternalLink className="size-3 shrink-0" />
              </a>
              {trailingPunct ? <span>{trailingPunct}</span> : null}
            </span>,
          );
        } else {
          tokens.push(token);
        }
        lastIdx = regex.lastIndex;
      }
      if (lastIdx < cleanStr.length) {
        tokens.push(cleanStr.substring(lastIdx));
      }
      return tokens.length > 0 ? tokens : cleanStr;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";

      // Code block start/end
      if (line.trim().startsWith("```")) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.trim().slice(3).trim();
          codeBuffer = [];
        } else {
          inCodeBlock = false;
          const currentCode = codeBuffer.join("\n");
          const curIdx = codeBlockIdx++;
          parsedElements.push(
            <div
              key={`code-${i}`}
              className="my-3 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 font-mono text-[13.5px] shadow-sm"
            >
              <div className="flex items-center justify-between bg-slate-950 px-3.5 py-2 border-b border-slate-800 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">{codeLanguage || "code"}</span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(currentCode, curIdx)}
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedCodeIdx === curIdx ? (
                    <>
                      <Check className="size-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto leading-relaxed">
                <code>{currentCode}</code>
              </pre>
            </div>,
          );
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      // Block Math Equation ($$ ... $$ or \[ ... \])
      if (/^\s*(\$\$|\\\[)/.test(line) || /(\$\$|\\\])\s*$/.test(line)) {
        const mathContent = formatMathSymbols(
          line.replace(/^\s*(\$\$|\\\[)|(\$\$|\\\])\s*$/g, "").trim(),
        );
        if (mathContent) {
          parsedElements.push(
            <div
              key={`math-${i}`}
              className="my-3 px-4 py-2.5 rounded-2xl bg-secondary/40 font-mono text-[14.5px] sm:text-[15px] border border-border/50 text-foreground overflow-x-auto text-center font-bold tracking-wide shadow-xs"
            >
              {mathContent}
            </div>,
          );
          continue;
        }
      }

      // Headers (### or ## or #)
      if (/^#{1,3}\s/.test(line)) {
        const text = line.replace(/^#{1,3}\s+/, "");
        parsedElements.push(
          <div
            key={`header-${i}`}
            className="font-bold text-[18px] sm:text-[19px] mt-3.5 mb-2 text-slate-950 dark:text-white tracking-tight"
          >
            {renderInline(text)}
          </div>,
        );
        continue;
      }

      // Bullet points (- or * or •)
      if (/^(\s*[-*•])\s+/.test(line)) {
        const text = line.replace(/^(\s*[-*•])\s+/, "");
        parsedElements.push(
          <div key={`bullet-${i}`} className="flex items-start gap-2.5 my-2 pl-0.5">
            <span className="text-red-500 mt-2.5 size-2 rounded-full bg-red-500 shrink-0 shadow-xs" />
            <div className="flex-1 leading-[1.7] text-slate-950 dark:text-zinc-50 font-normal sm:font-normal text-[15.5px] sm:text-[16px]">
              {renderInline(text)}
            </div>
          </div>,
        );
        continue;
      }

      // Numbered lists (1. or 2.)
      if (/^\s*\d+\.\s+/.test(line)) {
        const matchNum = line.match(/^\s*(\d+)\.\s+(.*)/);
        if (matchNum) {
          parsedElements.push(
            <div key={`num-${i}`} className="flex items-start gap-2.5 my-2 pl-0.5">
              <span className="font-bold text-red-500 shrink-0 text-[15px] mt-0.5">
                {matchNum[1]}.
              </span>
              <div className="flex-1 leading-[1.7] text-slate-950 dark:text-zinc-50 font-normal sm:font-normal text-[15.5px] sm:text-[16px]">
                {renderInline(matchNum[2] || "")}
              </div>
            </div>,
          );
          continue;
        }
      }

      // Empty lines (spacing)
      if (!line.trim()) {
        parsedElements.push(<div key={`empty-${i}`} className="h-2" />);
        continue;
      }

      // Regular paragraph with solid readable contrast
      parsedElements.push(
        <div
          key={`para-${i}`}
          className="leading-[1.7] text-slate-950 dark:text-zinc-50 font-normal sm:font-normal text-[15.5px] sm:text-[16px] my-1"
        >
          {renderInline(line)}
        </div>,
      );
    }

    return parsedElements;
  }, [content, copiedCodeIdx, videoMap, channelMap]);

  return <div className="space-y-1">{elements}</div>;
}

export function MessageBubble({
  message,
  isSelected,
  isSelectMode,
  onHold,
  onClick,
}: {
  message: ChatMessage;
  isSelected?: boolean;
  isSelectMode?: boolean;
  onHold: (m: ChatMessage) => void;
  onClick?: (m: ChatMessage) => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mine = message.role === "user";
  const [copied, setCopied] = useState(false);

  // YouTube video extraction and live details fetching
  const [videoMap, setVideoMap] = useState<Record<string, YouTubeVideoDetails>>({});
  const videoList = useMemo(() => extractYouTubeVideos(message.content), [message.content]);
  const videoIds = useMemo(() => videoList.map((v) => v.videoId), [videoList]);

  // YouTube channel extraction and live details fetching
  const [channelMap, setChannelMap] = useState<Record<string, YouTubeChannelDetails>>({});
  const channelList = useMemo(() => extractYouTubeChannels(message.content), [message.content]);

  useEffect(() => {
    if (videoIds.length === 0) return;
    let active = true;
    void fetchYouTubeVideoDetails(videoIds).then((details) => {
      if (active) {
        setVideoMap((prev) => ({ ...prev, ...details }));
      }
    });
    return () => {
      active = false;
    };
  }, [videoIds]);

  useEffect(() => {
    if (channelList.length === 0) return;
    let active = true;
    void fetchYouTubeChannelDetails(channelList).then((details) => {
      if (active) {
        setChannelMap((prev) => ({ ...prev, ...details }));
      }
    });
    return () => {
      active = false;
    };
  }, [channelList]);

  const start = () => {
    timer.current = setTimeout(() => onHold(message), 450);
  };
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const handleCopyMessage = () => {
    void navigator.clipboard?.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("px-4 my-4 transition-colors", mine ? "flex justify-end" : "block")}>
      {/* Selection Checkbox */}
      {isSelectMode && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick(message);
          }}
          className={cn(
            "flex size-5.5 shrink-0 items-center justify-center rounded-full border-2 transition-all cursor-pointer mb-2 mr-2 select-none",
            isSelected
              ? "bg-primary border-primary text-primary-foreground shadow-xs scale-105"
              : "border-muted-foreground/35 hover:border-primary/60 bg-background/80 hover:bg-background",
          )}
          title={isSelected ? "Deselect" : "Select"}
        >
          {isSelected && <Check className="size-3.5 stroke-[3]" />}
        </div>
      )}

      {mine ? (
        /* Gemini Style User Message: Soft Pill Capsule on Right */
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%]">
          <div
            role="button"
            tabIndex={0}
            onPointerDown={start}
            onPointerUp={cancel}
            onPointerLeave={cancel}
            onPointerCancel={cancel}
            onClick={() => {
              if (onClick) onClick(message);
            }}
            className={cn(
              "rounded-[22px] bg-[#f0f4f9] dark:bg-[#282a2c] text-slate-900 dark:text-zinc-100 px-5 py-3 text-[15px] sm:text-[16px] font-normal leading-[1.6] break-words shadow-xs select-text",
              isSelected ? "ring-2 ring-primary ring-offset-2" : "",
            )}
          >
            <MarkdownContent
              content={message.content}
              videoMap={videoMap}
              channelMap={channelMap}
            />
          </div>
          {/* YouTube video cards for user sent links */}
          {videoIds.length > 0 && (
            <div className="w-full mt-2.5 space-y-2">
              {videoIds.map((id) =>
                videoMap[id] ? <YouTubeVideoCard key={id} video={videoMap[id]} /> : null,
              )}
            </div>
          )}
          {/* YouTube channel cards for user sent links */}
          {channelList.length > 0 && (
            <div className="w-full mt-2.5 space-y-2">
              {channelList.map((c) => {
                const key = c.key.toLowerCase();
                return channelMap[key] ? (
                  <YouTubeChannelCard key={key} channel={channelMap[key]} />
                ) : null;
              })}
            </div>
          )}
        </div>
      ) : (
        /* Gemini Style AI Response: Native Canvas with AI Logo Header */
        <div className="w-full max-w-3xl select-text pt-1">
          {/* AI Header with Static Logo (Frozen after generation) */}
          <div className="flex items-center gap-2 mb-2 select-none">
            <img
              src={LEOMA_IDENTITY.avatar}
              alt="AI Agent"
              className="size-6 rounded-full object-cover border border-primary/20 shadow-xs"
            />
            <span className="text-[13px] font-bold text-foreground">{LEOMA_IDENTITY.name}</span>
          </div>

          <div
            role="button"
            tabIndex={0}
            onPointerDown={start}
            onPointerUp={cancel}
            onPointerLeave={cancel}
            onPointerCancel={cancel}
            onClick={() => {
              if (onClick) onClick(message);
            }}
            className={cn(
              "text-slate-950 dark:text-zinc-50 text-[15.5px] sm:text-[16px] leading-[1.7] break-words pl-8",
              isSelected ? "bg-primary/5 p-3 rounded-2xl ring-2 ring-primary" : "",
            )}
          >
            <MarkdownContent
              content={message.content}
              videoMap={videoMap}
              channelMap={channelMap}
            />
            {message.isStreaming && (
              <span className="inline-block size-2 ml-1 rounded-full bg-primary animate-pulse align-middle" />
            )}

            {/* YouTube Video Details Preview Cards at the bottom */}
            {videoIds.length > 0 && (
              <div className="mt-3.5 space-y-3">
                {videoIds.map((id) =>
                  videoMap[id] ? <YouTubeVideoCard key={id} video={videoMap[id]} /> : null,
                )}
              </div>
            )}

            {/* YouTube Channel Details Preview Cards at the bottom */}
            {channelList.length > 0 && (
              <div className="mt-3.5 space-y-3">
                {channelList.map((c) => {
                  const key = c.key.toLowerCase();
                  return channelMap[key] ? (
                    <YouTubeChannelCard key={key} channel={channelMap[key]} />
                  ) : null;
                })}
              </div>
            )}

            {/* Gemini Action Row: Copy Button */}
            <div className="flex items-center gap-3 mt-4 text-muted-foreground">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyMessage();
                }}
                className="flex items-center justify-center size-8 rounded-full hover:bg-secondary active:scale-90 transition-all cursor-pointer text-muted-foreground hover:text-foreground"
                title="Copy response"
              >
                {copied ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            </div>

            {/* Gemini Disclaimer */}
            <p className="text-[12px] font-medium text-muted-foreground/80 mt-1.5 select-none">
              AI Agent can make mistakes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Typing Bubble: Gemini Canvas with animated GIF avatar while thinking (No "Thinking..." text)
export function TypingBubble() {
  return (
    <div className="px-4 my-3 max-w-3xl animate-fade-in">
      <div className="flex items-center gap-2 select-none">
        <div className="relative size-6 shrink-0">
          <img
            src={LEOMA_IDENTITY.thinkingAvatar}
            alt="AI Agent"
            className="size-6 rounded-full object-cover shadow-xs border border-primary/30"
          />
        </div>
        <div className="flex items-center gap-1.5 py-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="bg-primary/80 size-2 animate-bounce rounded-full"
              style={{ animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
