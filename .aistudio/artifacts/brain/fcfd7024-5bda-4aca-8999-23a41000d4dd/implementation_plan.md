# Aarambh AI - Default Model, Complete Data Wipe on Logout, and Header Layout Plan

Updating Aarambh AI to enforce `gemini-3.8-flash` as the default model for all users, implement a total local storage wipe on logout, optimize onboarding name validation with rate-limit protection, and update the top header to showcase the Aarambh logo cleanly next to the model badge.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following choices were confirmed by the user in Phase 1:

- **Logout Data Handling**: Confirmed. Logout will automatically wipe all local storage (`localStorage.clear()`), purging all stored profile data, chat sessions, and message history so the user is treated as a 100% fresh new user upon signing out.
- **Top Header Layout**: Confirmed. The Aarambh squircle logo avatar will be positioned directly in the top header adjacent to the `Aarambh 3.8 Flash` model selector badge, eliminating empty header spacing while preserving a clean, responsive single-line layout.

---

## 1. Overview & Core Concept

- **Default Model**: All new user profiles default to `gemini-3.8-flash` (`Aarambh 3.8 Flash`).
- **Complete Session Purge**: Clicking "Sign Out" in profile settings completely wipes `aarambh_user_profile`, `aarambh_chat_sessions`, `aarambh_messages`, and all local cached states.
- **Resilient Name Validation**: Pre-validates display names with fast local regex (2-30 printable alpha-numeric/Unicode characters, rejecting whitespace-only or punctuation-only strings) before triggering AI validation (`validateDisplayNameWithAI`). If the AI call encounters rate limits (429) or network errors, it fails open gracefully using local heuristics so onboarding is never stuck.
- **Refined Header UX**: Compact brand header combining the Aarambh logo, brand name, and model selection dropdown badge seamlessly.

---

## 2. User Experience & Visual Design

- **Onboarding Flow**:
  - Unauthenticated / reset user sees the onboarding view asking for their display name.
  - Submitting a display name executes local regex validation first. If valid, AI checks for actual human name traits. If rate-limited or offline, local validation accepts valid name formats directly.
- **Header Navigation**:
  - Displays a crisp, squircle-cropped Aarambh logo avatar next to the `Aarambh 3.8 Flash` dropdown badge.
  - Sidebar toggle on the left, clear chat button, and profile menu on the right.
- **Logout Action**:
  - Selecting "Logout" purges all `localStorage` keys, re-initializes `useAuth` state to `user = null`, and routes back to the welcoming onboarding screen.

---

## 3. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Aarambh AI Web Client                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌───────────────────────┐             ┌────────────────────────────┐  │
│  │   Top Header Navbar   │             │   Onboarding / Profile     │  │
│  │  [Logo] Aarambh 3.8   │             │  Local Regex + AI Fail-Open│  │
│  └───────────┬───────────┘             └─────────────┬──────────────┘  │
│              │                                       │                 │
│              ▼                                       ▼                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                 useAuth & Local Storage Engine                   │  │
│  │   - signOut() -> localStorage.clear() + reset all React states   │  │
│  │   - defaultModel: 'gemini-3.8-flash'                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Interactive Components & State Modifications

1. **`src/hooks/useAuth.tsx`**:
   - Update `signOut`: Run `localStorage.clear()` (or explicitly remove all `aarambh_*` items) and reset `user` state to `null`.
   - Update default profile model initialization to `gemini-3.8-flash`.

2. **`src/lib/ai.functions.ts`**:
   - Enhance `validateDisplayNameWithAI`:
     - Local validation check for non-empty, non-symbol-only, 2-30 character string.
     - Try AI evaluation via `/api/gemini/generate`.
     - `try/catch` block: On 429 rate-limit or network failure, fail open using local regex validation response.

3. **`src/routes/index.tsx`**:
   - Update top header: Render the Aarambh logo image (squircle icon) right beside the `Aarambh 3.8 Flash` model title/badge.
   - Ensure `Aarambh 3.8 Flash` is always the default model fallback.

---

## 4. Verification & Testing Strategy

- Run `compile_applet` and `lint_applet` to ensure zero build errors and clean TypeScript compliance.
- Test onboarding with valid names, invalid punctuation/junk names, and verify fallback behavior.
- Test logout flow to verify complete clearing of `localStorage` and reset to onboarding state.
