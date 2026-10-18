# Implementation Plan - Aarambh AI Chat Optimization & Response Handling

Comprehensive implementation plan to refine response action buttons, extend intelligent chat-clearing triggers across Hindi and English phrases, prevent API response hanging with a 20-second timeout, and handle safety filter blocks in the witty backbencher persona.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed in Phase 1:

- **Action Buttons Under AI Responses**: Remove the Edit button from under AI responses (`role === "assistant"`), keeping only the Copy button.
- **Chat Deletion Triggers**: Automatically detect any intent to clear/delete chat in English or Hindi (e.g., "clear chat", "delete chat", "delete all messages", "sari chat delete kardo", "puri chat uda do", "nayi chat chalu karo", "reset chat") and execute chat clearing with a loading indicator.
- **Timeout & Safety Filter Handling**: Implement a strict 20-second request timeout with an AbortController. Replace generic safety filter blocks or timeout errors with a witty backbencher persona response (e.g., playful Hindi banter explaining that the server hit a filter or timed out).

---

## 1. Overview & Core Concept

**Aarambh** is a Gen Z backbencher Indian college student AI companion. This update addresses user experience nuances:

1. **Clean Action Row**: Users only edit their own prompts, not AI outputs. The AI message footer will feature a clean Copy button and disclaimer.
2. **Intent-Driven Chat Reset**: Natural language prompts requesting chat clearing or deletion will trigger the smooth clearing overlay immediately.
3. **Resilient AI Pipeline**: API calls will no longer hang indefinitely. A 20-second timeout ensures fast feedback, and safety/error responses will stay in character as a witty backbencher friend rather than outputting sterile corporate error blocks.

---

## 2. User Experience & Visual Design

- **Message Action Bar**:
  - _User Bubble_: Copy prompt & Edit prompt buttons.
  - _AI Bubble_: Clean Copy response button only.
- **Auto-Clear Overlay**:
  - When user types phrases like "sari chat uda do", "clear chat", "delete messages", "nayi chat shuru karo":
  - Immediately triggers the full-card blur loader: "Clearing Chat..." with a smooth spinner.
  - Clears local storage memory and resets messages state gracefully within 750ms.
- **Error & Safety State**:
  - When the API hits a 20s timeout or safety filter block:
  - Generates a witty, friendly in-character backbencher message: `"Arey bhai! Server ka mood off ho gaya lagta hai / safety filter lag gaya 😂 Koi doosra sawal pooch bro, phirse try karte hain!"`

---

## 3. Key Product Decisions & Trade-Offs

1. **Client-Side Intent Regex Expansion**:
   - _Chosen Approach_: Expand `isClearRequest` in `src/routes/index.tsx` to include multi-lingual patterns (English, Hindi, Hinglish).
   - _Why_: Provides instant client-side UI feedback without waiting for an LLM API round-trip to execute a simple UI clearing action.

2. **20-Second Request AbortController**:
   - _Chosen Approach_: Wrap custom AI endpoint fetches in `src/lib/ai.functions.ts` with an `AbortController` signal timed to 20 seconds.
   - _Why_: Eliminates infinite loading loops when remote backend hosting or upstream providers experience latency spikes.

3. **In-Character Safety / Fallback Catch**:
   - _Chosen Approach_: Intercept safety block error strings (like `"safety filters stepped in"`) in `ai.functions.ts` and replace them with natural backbencher text.
   - _Why_: Maintains persona immersion without frustrating the user with sterile system disclaimers.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            User Input & Chat UI                              │
│  - Input Field / Form Submission (src/routes/index.tsx)                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
      [Clear Chat Intent Detection]            [Normal AI Query]
      - Multi-lingual Regex Check              - Timeout: 20s AbortController
      - Triggers `isClearingChat`              - Call custom endpoint in
      - Resets localStorage & state              src/lib/ai.functions.ts
                    │                                     │
                    ▼                                     ▼
        [Smooth Spinner Loader]                [Catch Error / Safety]
        - "Clearing Chat..."                   - Intercept filter/timeout
                                               - Return Backbencher persona msg
```

### Component & File Touches

1. **`src/components/chat/MessageBubble.tsx`**:
   - Remove `onEdit` call and Pencil icon from AI response footer (`role === "assistant"`).
   - Keep `onEdit` exclusively on User messages (`mine === true`).

2. **`src/routes/index.tsx`**:
   - Expand `isClearRequest` regular expression to catch English, Hindi, and Hinglish deletion commands.
   - Smoothly transition clearing overlay states.

3. **`src/lib/ai.functions.ts`**:
   - Add `AbortController` timeout (20,000ms) to `sendChatMessage`.
   - Add fallback catch to detect safety filter errors or timeouts and return a witty backbencher response.

---

## Verification Plan

1. **Compile & Lint**: Run `compile_applet` and `lint_applet` to ensure zero compilation or syntax errors.
2. **Action Bar Test**: Verify AI bubbles show only Copy button, and User bubbles show Copy + Edit.
3. **Chat Clear Test**: Verify typing "sari chat delete kardo" or "clear chat" immediately triggers the loader and clears history.
4. **Timeout & Error Handling Test**: Verify AbortController prevents long loops and returns friendly persona text on error.
