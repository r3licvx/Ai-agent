# Aarambh AI — Pristine Headings, Dynamic Multi-Color Text, Anime Filtered TMDB, and Stream Control Suite

## Executive Summary
This upgrade cleans up markdown heading parsing so raw `#` symbols never leak into headers, empowers Aarambh to highlight text in vibrant colors (red, green, yellow, blue, purple, orange), adds dedicated Anime/Animation genre filtering to TMDB with spacious card geometry, streamlines the "This one" movie selection into a clean compact visual card passing TMDB IDs in the background, and introduces a stop-generation button with partial-text regeneration.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product design choices have been confirmed through interactive interview:
> 1. **Colored Text Highlights**: Automatic dynamic highlights (red, green, yellow, blue, purple, orange) for key terms, names, and concepts.
> 2. **Movie Selection Appearance**: Compact white card with movie poster, title, and "This one" badge in the user message, passing TMDB ID to the AI in the background.
> 3. **Streaming Abort Behavior**: When aborted by user, retain partial text and display an instant "Regenerate" button.

---

## 1. Overview & Core Concept

- **Zero-Hash Clean Headings**: Strips any prefix or suffix hash symbols (`#`, `##`, `###`) completely, rendering crisp, modern title typography.
- **AI Dynamic Multi-Color Highlights**: Aarambh uses custom color tags (`<red>...</red>`, `<green>...</green>`, `<yellow>...</yellow>`, `<blue>...</blue>`, `<purple>...</purple>`, `<orange>...</orange>`) to spotlight critical points, formulas, names, and insights.
- **Dedicated Anime & Animation Filtering**: When queries mention anime or animation, TMDB queries specifically target genre `16` (Animation) or anime keywords, avoiding unrelated live-action series.
- **Spacious TMDB Carousel**: Upgrades card geometry so posters and metadata are spacious, legible, and never feel squished.
- **Streamlined Selection Flow**: Selecting a movie from the carousel creates a visual "This one" compact card in the chat while passing the TMDB ID, title, and year to Aarambh for a full breakdown.
- **Stream Stop & Regenerate Controls**: A stop button during streaming/thinking, and a 1-tap regenerate button if generation is stopped or incomplete.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Reading Structured Responses**: Headers appear as clean, large, bold typography with no leading `#` characters. Important concepts glow with semantic text colors (e.g. green for positives/results, yellow for warnings, red for critical rules, blue/purple for key terms).
2. **Anime & Movie Browsing**: Asking for anime like "Death Note" or "Attack on Titan" returns actual animation series posters, with spacious `140px`-wide cards, crisp typography, and touch-friendly targets.
3. **Selecting a Movie**: Tapping "This one" on any card immediately inserts a clean user message card showing the poster thumbnail, title, and "✓ This one" badge. Aarambh responds with full details using the background TMDB ID.
4. **Stopping & Regenerating**: When Aarambh is thinking or streaming, the send button switches to a Stop icon (`Square`). Clicking it halts generation instantly, keeping the partial text and revealing a "Regenerate" button next to the copy action.

### Visual Styling & Palette
- **Multi-Color Tokens**:
  - `red`: `text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/10 px-1 py-0.5 rounded-md`
  - `green`: `text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1 py-0.5 rounded-md`
  - `yellow`: `text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-1 py-0.5 rounded-md`
  - `blue`: `text-sky-600 dark:text-sky-400 font-semibold bg-sky-500/10 px-1 py-0.5 rounded-md`
  - `purple`: `text-purple-600 dark:text-purple-400 font-semibold bg-purple-500/10 px-1 py-0.5 rounded-md`
  - `orange`: `text-orange-600 dark:text-orange-400 font-semibold bg-orange-500/10 px-1 py-0.5 rounded-md`
- **Stop Button**: High-contrast square stop button (`bg-destructive text-destructive-foreground`).
- **Regenerate Button**: Smooth rotate icon (`RotateCcw`) beside Copy.

---

## 3. Technical Architecture & Component Mapping

```
┌─────────────────────────────────────────────────────────────┐
│                       Chat Page View                        │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Input Bar & Stream Controls            │   │
│   │  - AbortController signal management                │   │
│   │  - Toggle Send vs Stop button                       │   │
│   │  - onRegenerate handler for incomplete messages     │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              │                              │
│   ┌──────────────────────────▼──────────────────────────┐   │
│   │                   Message Bubble                    │   │
│   │  - Clean Heading Regex (No raw '#' leakage)         │   │
│   │  - Color Tag Parser (<red>, <green>, etc.)          │   │
│   │  - Compact User Selection Card (<ThisOneCard />)    │   │
│   │  - Regenerate Action Button for stopped messages    │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              │                              │
│   ┌──────────────────────────▼──────────────────────────┐   │
│   │               TMDB Integration Engine               │   │
│   │  - Anime & Animation query detector & filter        │   │
│   │  - Enhanced card geometry (no squished layout)      │   │
│   │  - Background payload with TMDB ID                  │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Details
- `src/components/chat/MessageBubble.tsx`:
  - Regex sanitization of `#` in headings: `/^#+\s*|\s*#+$/g`.
  - Color tag regex and token renderer for `<red>`, `<green>`, `<yellow>`, `<blue>`, `<purple>`, `<orange>`.
  - Render compact user selection card when message contains a selected movie payload.
  - Add `onRegenerate` button for incomplete messages (`isAborted: true`).
- `src/lib/tmdb.ts`:
  - Detect anime keywords (`anime`, `एनीमे`, `animation`, `manga`) and prioritize animation media type and genre ID `16`.
- `src/components/chat/TMDBMovieCard.tsx`:
  - Increase card width and spacing to avoid cramped text.
- `src/routes/index.tsx`:
  - Add `AbortController` tracking to cancel streaming on Stop click.
  - Implement `handleRegenerate(messageId)` and pass `isAborted` status.
- `src/lib/constants.ts`:
  - Teach Aarambh how to use `<green>`, `<yellow>`, `<red>`, `<blue>`, `<purple>`, `<orange>` tags naturally for highlights.
