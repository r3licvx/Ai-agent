import React, { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { Copy, Check, ExternalLink, Pencil, RotateCcw } from "lucide-react";
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
import { InstagramCard, TelegramCard } from "@/components/chat/SocialContactCard";
import { TMDBMediaCards } from "@/components/chat/TMDBMovieCard";
import { findBestTMDBMatch, extractMediaSearchQueries, type TMDBMediaItem } from "@/lib/tmdb";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  isStreaming?: boolean;
  isAborted?: boolean;
  tmdbItems?: TMDBMediaItem[];
};

function formatMathSymbols(text: string): string {
  let str = text;
  str = str.replace(/\\d?frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1 / $2)");
  str = str.replace(/\\sqrt\{([^{}]+)\}/g, "√($1)");
  str = str.replace(/\\sqrt\[([^{}]+)\]\{([^{}]+)\}/g, "$1√($2)");
  str = str.replace(/\\times\b/g, "×");
  str = str.replace(/\\cdot\b/g, "·");
  str = str.replace(/\\div\b/g, "÷");
  str = str.replace(/\\pm\b/g, "±");
  str = str.replace(/\\approx\b/g, "≈");
  str = str.replace(/\\neq\b/g, "≠");
  str = str.replace(/\\leq\b/g, "≤");
  str = str.replace(/\\geq\b/g, "≥");
  str = str.replace(/\\infty\b/g, "∞");
  str = str.replace(/\\alpha\b/g, "α");
  str = str.replace(/\\beta\b/g, "β");
  str = str.replace(/\\theta\b/g, "θ");
  str = str.replace(/\\pi\b/g, "π");
  str = str.replace(/\\Delta\b/g, "Δ");
  str = str.replace(/\\Sigma\b/g, "Σ");
  return str;
}

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

  const handleCopyCode = (code: string, idx: number) => {
    void navigator.clipboard?.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const elements = useMemo(() => {
    // Strip raw HTML color tags if any model attempts to output them
    const cleanContent = content
      .replace(
        /<\/?(?:red|green|yellow|blue|purple|orange|pink|cyan|emerald|amber|rose)[^>]*>/gi,
        "",
      )
      .replace(/\[\/?(?:red|green|yellow|blue|purple|orange|pink|cyan|emerald|amber|rose)\]/gi, "")
      .replace(/https?:\/\/googleusercontent\.com\/[^\s)]+/gi, "")
      .replace(/\[([^\]]+)\]\s*\n\s*\((https?:\/\/[^\s)]+)\)/g, "[$1]($2)")
      .replace(/\*\*(https?:\/\/[^\s*]+)\*\*/g, "$1")
      .replace(/\*\*\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\*\*/g, "[$1]($2)")
      .replace(/\[\*\*([^*]+)\*\*\]\((https?:\/\/[^\s)]+)\)/g, "[$1]($2)");

    const lines = cleanContent.split("\n");
    const parsedElements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLanguage = "";
    let codeBlockIdx = 0;

    const renderInline = (str: string): React.ReactNode => {
      const cleanStr = formatMathSymbols(str);
      const tokens: React.ReactNode[] = [];

      const regex =
        /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*.*?\*\*|`.*?`|\$[^$]+?\$|\*[^\s*][^*]*[^\s*]\*|@umang\.dl|@Umangexe|(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^\s]*&)?v=|shorts\/|embed\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}(?:[^\s<>"')]*)|(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/(?:channel\/UC[a-zA-Z0-9_-]{22}|@[a-zA-Z0-9_.-]+|c\/[a-zA-Z0-9_.-]+)(?:[^\s<>"')]*)|https?:\/\/[^\s<>"')]+)/gi;

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
            const rawLabel = linkMatch[1] || "";
            const label = rawLabel.replace(/^\*\*|\*\*$/g, "").trim();
            const targetUrl = linkMatch[2];

            if (isYouTubeVideoUrl(targetUrl)) {
              const videoId = getYouTubeVideoId(targetUrl);
              const video = videoId && videoMap ? videoMap[videoId] : undefined;
              const displayTitle = video?.title || label || "YouTube Video";
              const chAvatar = video?.channelAvatarUrl;

              tokens.push(
                <a
                  key={match.index}
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mx-0.5 rounded-lg bg-muted/60 hover:bg-muted text-foreground font-bold text-[13px] sm:text-[13.5px] transition-all border border-border/60 align-middle shadow-2xs group/yt no-underline min-w-0"
                  title={video?.title ? `Watch "${video.title}" on YouTube` : "Watch on YouTube"}
                >
                  <YouTubeIcon className="size-4 shrink-0" />
                  {chAvatar && (
                    <img
                      src={chAvatar}
                      alt=""
                      className="size-3.5 rounded-full object-cover shrink-0"
                    />
                  )}
                  <span className="underline decoration-border group-hover/yt:decoration-foreground font-bold max-w-[200px] sm:max-w-[360px] truncate">
                    {displayTitle}
                  </span>
                  <ExternalLink className="size-3 text-muted-foreground shrink-0 opacity-80 group-hover/yt:opacity-100" />
                </a>,
              );
              lastIdx = regex.lastIndex;
              continue;
            }

            tokens.push(
              <a
                key={match.index}
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
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
          const innerBold = token.slice(2, -2).trim();
          if (isYouTubeVideoUrl(innerBold) || isYouTubeChannelUrl(innerBold)) {
            tokens.push(renderInline(innerBold));
          } else {
            tokens.push(
              <strong key={match.index} className="font-bold text-slate-950 dark:text-white">
                {renderInline(innerBold)}
              </strong>,
            );
          }
        } else if (token.startsWith("`") && token.endsWith("`")) {
          tokens.push(
            <code
              key={match.index}
              className="rounded-md bg-black/[0.08] dark:bg-white/[0.12] text-indigo-600 dark:text-indigo-400 font-mono text-[13px] px-1.5 py-0.5 font-bold"
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
        } else if (token === "@umang.dl") {
          // Instagram handle highlight badge
          tokens.push(
            <a
              key={match.index}
              href="https://instagram.com/umang.dl"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 font-bold text-[13px] border border-pink-500/30 hover:border-pink-500/60 transition-all no-underline align-baseline"
            >
              <span>@umang.dl</span>
              <ExternalLink className="size-2.5" />
            </a>,
          );
        } else if (token === "@Umangexe") {
          // Telegram handle highlight badge
          tokens.push(
            <a
              key={match.index}
              href="https://t.me/Umangexe"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-lg bg-[#229ED9]/15 text-[#229ED9] font-bold text-[13px] border border-[#229ED9]/30 hover:border-[#229ED9]/60 transition-all no-underline align-baseline"
            >
              <span>@Umangexe</span>
              <ExternalLink className="size-2.5" />
            </a>,
          );
        } else if (isYouTubeVideoUrl(token)) {
          const videoId = getYouTubeVideoId(token);
          const trailingMatch = token.match(/[.,!?:;)"']+$/);
          const trailingPunct = trailingMatch ? trailingMatch[0] : "";
          const video = videoId && videoMap ? videoMap[videoId] : undefined;
          const displayTitle = video?.title || "YouTube Video";
          const chAvatar = video?.channelAvatarUrl;

          tokens.push(
            <span key={match.index} className="inline-flex items-center align-baseline">
              <a
                href={videoId ? `https://www.youtube.com/watch?v=${videoId}` : token}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mx-0.5 rounded-lg bg-muted/60 hover:bg-muted text-foreground font-bold text-[13px] sm:text-[13.5px] transition-all border border-border/60 align-middle shadow-2xs group/yt no-underline min-w-0"
                title={video?.title ? `Watch "${video.title}" on YouTube` : "Watch on YouTube"}
              >
                {chAvatar ? (
                  <img
                    src={chAvatar}
                    alt=""
                    className="size-4 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <span className="size-4 rounded-full bg-red-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                    {(video?.channelTitle || displayTitle).charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="underline decoration-border group-hover/yt:decoration-foreground font-bold max-w-[200px] sm:max-w-[360px] truncate">
                  {displayTitle}
                </span>
                <ExternalLink className="size-3 text-muted-foreground shrink-0 opacity-80 group-hover/yt:opacity-100" />
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
          const chAvatar = channel?.avatarUrl;

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
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mx-0.5 rounded-lg bg-muted/60 hover:bg-muted text-foreground font-bold text-[13px] sm:text-[13.5px] transition-all border border-border/60 align-middle shadow-2xs group/yt no-underline min-w-0"
                title={`Visit "${displayTitle}" channel on YouTube`}
              >
                {chAvatar ? (
                  <img
                    src={chAvatar}
                    alt=""
                    className="size-4 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <span className="size-4 rounded-full bg-red-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                    {displayTitle.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="underline decoration-border group-hover/yt:decoration-foreground font-bold max-w-[200px] sm:max-w-[360px] truncate">
                  {displayTitle}
                </span>
                <ExternalLink className="size-3 text-muted-foreground shrink-0 opacity-80 group-hover/yt:opacity-100" />
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

      // 1. Code Block
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

      // 2. Horizontal Rule Divider (--- or ***)
      if (/^\s*[-*_]{3,}\s*$/.test(line)) {
        parsedElements.push(<hr key={`hr-${i}`} className="my-4 border-t border-border/70" />);
        continue;
      }

      // 3. Markdown Table (Style B Quick Matrix)
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        const tableLines = [line.trim()];
        while (
          i + 1 < lines.length &&
          lines[i + 1]?.trim().startsWith("|") &&
          lines[i + 1]?.trim().endsWith("|")
        ) {
          i++;
          tableLines.push(lines[i]!.trim());
        }

        if (tableLines.length >= 2) {
          const headerRow = tableLines[0]
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim());
          const hasSeparator = /^\|(?:\s*:?-+:?\s*\|)+$/.test(tableLines[1]);
          const dataRows = (hasSeparator ? tableLines.slice(2) : tableLines.slice(1)).map((r) =>
            r
              .split("|")
              .slice(1, -1)
              .map((c) => c.trim()),
          );

          parsedElements.push(
            <div
              key={`tbl-${i}`}
              className="my-3 overflow-x-auto rounded-xl border border-border/70 bg-card/50 shadow-2xs"
            >
              <table className="w-full text-left text-[13.5px] sm:text-[14px] border-collapse">
                <thead className="bg-muted/70 border-b border-border/70 text-foreground font-bold">
                  <tr>
                    {headerRow.map((head, hIdx) => (
                      <th key={hIdx} className="px-3 py-2 font-bold whitespace-nowrap">
                        {renderInline(head)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {dataRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-foreground/90 font-medium">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>,
          );
          continue;
        }
      }

      // 4. Block Math Equation
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

      // 5. Final Answer / Key Result Highlight Box
      if (
        /^\s*\*\*(?:Final Answer|Answer|Result|Conclusion):/i.test(line) ||
        /^\s*(?:Final Answer|Answer|Result|Conclusion):/i.test(line)
      ) {
        parsedElements.push(
          <div
            key={`final-ans-${i}`}
            className="my-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-100 font-semibold shadow-xs"
          >
            {renderInline(line)}
          </div>,
        );
        continue;
      }

      // 6. Blockquotes for Insights (> **Pro Tip:** ...)
      if (/^\s*>\s*/.test(line)) {
        const quoteText = line.replace(/^\s*>\s*/, "");
        parsedElements.push(
          <blockquote
            key={`quote-${i}`}
            className="my-2.5 pl-3.5 py-1.5 border-l-3 border-primary/70 bg-primary/5 rounded-r-xl text-[14.5px] sm:text-[15px] leading-relaxed text-foreground font-medium italic"
          >
            {renderInline(quoteText)}
          </blockquote>,
        );
        continue;
      }

      // 7. Ignore empty hash-only lines (e.g. "##", "###", "## ##")
      if (/^[\s#]+$/.test(line)) {
        continue;
      }

      // 8. Headers (#, ##, ###) - clean, bold, zero # leakage
      if (/^\s*#+/.test(line)) {
        const cleanHeader = line
          .replace(/^[\s#]+/, "")
          .replace(/[\s#]+$/, "")
          .trim();

        if (!cleanHeader) {
          continue;
        }

        const isH3 = /^\s*#{3,}/.test(line);

        if (isH3) {
          parsedElements.push(
            <h3
              key={`h3-${i}`}
              className="font-extrabold text-[16.5px] sm:text-[17.5px] mt-4 mb-2 text-foreground tracking-tight leading-snug"
            >
              {renderInline(cleanHeader)}
            </h3>,
          );
        } else {
          parsedElements.push(
            <h2
              key={`h2-${i}`}
              className="font-black text-[18px] sm:text-[20px] mt-5 mb-2.5 pb-1 border-b border-border/50 text-foreground tracking-tight leading-snug"
            >
              {renderInline(cleanHeader)}
            </h2>,
          );
        }
        continue;
      }

      // 9. Bullet points (* **The Hook:** ... or - ...)
      if (/^(\s*[-*•])\s+/.test(line)) {
        const text = line.replace(/^(\s*[-*•])\s+/, "");
        parsedElements.push(
          <div key={`bullet-${i}`} className="flex items-start gap-2.5 my-1.5 pl-0.5">
            <span className="mt-2.5 size-1.5 rounded-full bg-primary shrink-0 shadow-2xs" />
            <div className="flex-1 leading-[1.7] text-slate-950 dark:text-zinc-50 font-normal text-[15px] sm:text-[15.5px]">
              {renderInline(text)}
            </div>
          </div>,
        );
        continue;
      }

      // 10. Numbered lists (1., 2.)
      if (/^\s*\d+\.\s+/.test(line)) {
        const matchNum = line.match(/^\s*(\d+)\.\s+(.*)/);
        if (matchNum) {
          parsedElements.push(
            <div key={`num-${i}`} className="flex items-start gap-2.5 my-1.5 pl-0.5">
              <span className="font-bold text-primary shrink-0 text-[14.5px] mt-0.5">
                {matchNum[1]}.
              </span>
              <div className="flex-1 leading-[1.7] text-slate-950 dark:text-zinc-50 font-normal text-[15px] sm:text-[15.5px]">
                {renderInline(matchNum[2] || "")}
              </div>
            </div>,
          );
          continue;
        }
      }

      if (!line.trim()) {
        parsedElements.push(<div key={`empty-${i}`} className="h-2" />);
        continue;
      }

      // Standard Paragraph
      parsedElements.push(
        <div
          key={`para-${i}`}
          className="leading-[1.7] text-slate-950 dark:text-zinc-50 font-normal text-[15px] sm:text-[15.5px] my-1"
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
  previousMessage,
  onEdit,
  onRegenerate,
}: {
  message: ChatMessage;
  previousMessage?: ChatMessage;
  onEdit?: (m: ChatMessage) => void;
  onRegenerate?: (messageId: string) => void;
}) {
  const mine = message.role === "user";
  const [copied, setCopied] = useState(false);

  // TMDB movie extraction: includes verified backend items and auto-extracted titles
  const [tmdbItems, setTmdbItems] = useState<TMDBMediaItem[]>([]);
  const mediaQueries = useMemo(() => {
    // Strictly do not extract or search media while message is currently streaming
    if (message.role !== "assistant" || message.isStreaming) return [];
    return extractMediaSearchQueries(message.content, previousMessage?.content);
  }, [message.content, message.role, message.isStreaming, previousMessage?.content]);

  useEffect(() => {
    // If message is streaming or user, clear cards
    if (message.isStreaming || message.role !== "assistant") {
      setTmdbItems([]);
      return;
    }

    // If no media queries extracted (e.g. user was studying or chatting about general topics),
    // strictly do NOT show any movie posters!
    if (mediaQueries.length === 0) {
      if (message.tmdbItems && message.tmdbItems.length > 0) {
        const textLower = message.content.toLowerCase();
        const strictlyMentioned = message.tmdbItems.filter(
          (it) =>
            textLower.includes(it.title.toLowerCase()) ||
            (it.originalTitle && textLower.includes(it.originalTitle.toLowerCase())),
        );
        setTmdbItems(strictlyMentioned);
      } else {
        setTmdbItems([]);
      }
      return;
    }

    let active = true;

    const runSearch = async () => {
      // Find matches strictly for the specific titles recommended in THIS message
      const items: TMDBMediaItem[] = [];

      for (const q of mediaQueries) {
        if (!active) break;
        const qLower = q.query.toLowerCase();

        // 1. Check if backend message.tmdbItems already has this exact title
        const existing = (message.tmdbItems || []).find(
          (it) =>
            it.title.toLowerCase() === qLower ||
            (it.originalTitle && it.originalTitle.toLowerCase() === qLower) ||
            it.title.toLowerCase().includes(qLower) ||
            qLower.includes(it.title.toLowerCase()),
        );

        if (existing) {
          if (!items.some((it) => it.id === existing.id)) {
            items.push(existing);
          }
          continue;
        }

        // 2. Fetch live match from TMDB for this recommended title
        try {
          const matched = await findBestTMDBMatch(q.query, q.year, q.isAnime);
          if (matched && !items.some((it) => it.id === matched.id)) {
            items.push(matched);
          }
        } catch {
          // ignore
        }
      }

      if (active) {
        setTmdbItems(items);
      }
    };

    void runSearch();

    return () => {
      active = false;
    };
  }, [mediaQueries, message.content, message.isStreaming, message.role, message.tmdbItems]);

  // YouTube video extraction and live details fetching
  const [videoMap, setVideoMap] = useState<Record<string, YouTubeVideoDetails>>({});
  const videoList = useMemo(() => extractYouTubeVideos(message.content), [message.content]);
  const videoIds = useMemo(() => videoList.map((v) => v.videoId), [videoList]);

  // YouTube channel extraction and live details fetching
  const [channelMap, setChannelMap] = useState<Record<string, YouTubeChannelDetails>>({});
  const channelList = useMemo(() => extractYouTubeChannels(message.content), [message.content]);

  // Check for Umang social mentions to display dedicated cards
  const hasInstagramMention = useMemo(() => {
    return /@umang\.dl|instagram\.com\/umang\.dl/i.test(message.content);
  }, [message.content]);

  const hasTelegramMention = useMemo(() => {
    return /@Umangexe|t\.me\/Umangexe/i.test(message.content);
  }, [message.content]);

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

  const handleCopyMessage = () => {
    void navigator.clipboard?.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("px-4 my-4 transition-colors", mine ? "flex justify-end" : "block")}
    >
      {mine ? (
        /* Clean User Message */
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%] group/user">
          <div className="rounded-[22px] bg-[#f0f4f9] dark:bg-[#282a2c] text-slate-900 dark:text-zinc-100 px-5 py-3 text-[15px] sm:text-[16px] font-normal leading-[1.6] break-words shadow-xs select-text">
            <MarkdownContent
              content={message.content}
              videoMap={videoMap}
              channelMap={channelMap}
            />
          </div>

          {/* User Action Row: Copy and Edit Pencil button */}
          <div className="flex items-center gap-1.5 mt-1.5 pr-2 opacity-80 group-hover/user:opacity-100 transition-opacity">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(message)}
                className="flex items-center justify-center size-7 rounded-full hover:bg-secondary active:scale-90 transition-all cursor-pointer text-muted-foreground hover:text-foreground"
                title="Edit message"
              >
                <Pencil className="size-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyMessage}
              className="flex items-center justify-center size-7 rounded-full hover:bg-secondary active:scale-90 transition-all cursor-pointer text-muted-foreground hover:text-foreground"
              title="Copy prompt"
            >
              {copied ? (
                <Check className="size-3.5 text-emerald-500" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
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
          {/* AI Header with Static Logo (Aarambh AI with clean 2-color gradient) */}
          <div className="flex items-center gap-2 mb-2 select-none">
            <img
              src={LEOMA_IDENTITY.avatar}
              alt={LEOMA_IDENTITY.name}
              className="size-6 rounded-full object-cover border border-primary/20 shadow-xs"
            />
            <span className="text-[13.5px] font-bold tracking-tight text-foreground">
              {LEOMA_IDENTITY.name}
            </span>
          </div>

          {/* TMDB Movie & Anime Posters positioned at the top, outside pl-8 indentation for full width presence */}
          {!message.isStreaming && tmdbItems.length > 0 && (
            <div className="w-full my-1.5 sm:my-2">
              <TMDBMediaCards items={tmdbItems} />
            </div>
          )}

          <div className="text-slate-950 dark:text-zinc-50 text-[15px] sm:text-[15.5px] leading-[1.7] break-words pl-8">
            <MarkdownContent
              content={message.content}
              videoMap={videoMap}
              channelMap={channelMap}
            />
            {message.isStreaming && (
              <span className="inline-block size-2 ml-1 rounded-full bg-primary animate-pulse align-middle" />
            )}

            {/* YouTube Video Details Preview Cards at the bottom */}
            {!message.isStreaming && videoIds.length > 0 && (
              <div className="mt-3.5 space-y-3">
                {videoIds.map((id) =>
                  videoMap[id] ? <YouTubeVideoCard key={id} video={videoMap[id]} /> : null,
                )}
              </div>
            )}

            {/* YouTube Channel Details Preview Cards at the bottom */}
            {!message.isStreaming && channelList.length > 0 && (
              <div className="mt-3.5 space-y-3">
                {channelList.map((c) => {
                  const key = c.key.toLowerCase();
                  return channelMap[key] ? (
                    <YouTubeChannelCard key={key} channel={channelMap[key]} />
                  ) : null;
                })}
              </div>
            )}

            {/* Creator Social Connection Cards (Instagram & Telegram) */}
            {hasInstagramMention && <InstagramCard />}
            {hasTelegramMention && <TelegramCard />}

            {/* Action Row: Copy button & Regenerate button */}
            <div className="flex items-center gap-2.5 mt-4 text-muted-foreground flex-wrap">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="flex items-center justify-center size-8 rounded-full hover:bg-secondary active:scale-90 transition-all cursor-pointer text-muted-foreground hover:text-foreground"
                title="Copy response"
              >
                {copied ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>

              {onRegenerate && !message.isStreaming && (
                <button
                  type="button"
                  onClick={() => onRegenerate(message.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-secondary active:scale-95 transition-all cursor-pointer text-muted-foreground hover:text-foreground text-xs font-semibold"
                  title="Regenerate this response"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Regenerate</span>
                </button>
              )}

              {message.isAborted && (
                <span className="text-[11px] font-medium text-amber-500/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full select-none">
                  Generation stopped
                </span>
              )}
            </div>

            {/* Disclaimer */}
            <p className="text-[12px] font-medium text-muted-foreground/80 mt-1.5 select-none">
              {LEOMA_IDENTITY.name} can make mistakes.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Typing Bubble: Ultra-Clean Aesthetic Floating Thinking Pill
export function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className="px-4 my-2 max-w-3xl pl-8 select-none"
    >
      <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#f0f4f9]/90 dark:bg-[#1e1f20]/90 border border-border/40 shadow-2xs backdrop-blur-md">
        <div className="flex items-center gap-1.5 py-0.5">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          <span
            className="size-1.5 rounded-full bg-primary/75 animate-pulse"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="size-1.5 rounded-full bg-primary/50 animate-pulse"
            style={{ animationDelay: "300ms" }}
          />
        </div>
        <span className="text-[12px] font-semibold tracking-tight text-foreground/80">
          Aarambh is thinking...
        </span>
      </div>
    </motion.div>
  );
}
