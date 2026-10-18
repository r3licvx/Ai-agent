# Implementation Plan - Header Gradient Feather Mask & Keyboard Focus Fix

We will implement the two UI/UX refinements requested by the user:

## 1. Top Header Feathering / Gradient Mask Effect
- **Problem**: The top header currently has a hard border/solid background cut-off that crops chat messages abruptly as they scroll up.
- **Solution**:
  - Replace hard border lines on the top header in both `src/routes/index.tsx` (Chat Page Header) and `src/components/chat/ProfileView.tsx` (Settings Page Header) with a translucent backdrop blur and a bottom CSS mask-image gradient (`linear-gradient(to bottom, black 65%, transparent 100%)`).
  - This creates a smooth feathering transition where messages dynamically dissolve into the top header as they scroll underneath it.

## 2. Disable Auto-Keyboard Focus After AI Response
- **Problem**: Calling `inputRef.current?.focus()` after AI finishes generating a response automatically triggers the mobile soft keyboard to pop up, displacing the screen layout.
- **Solution**:
  - Remove `inputRef.current?.focus()` from the `finally` block in `send` function in `src/routes/index.tsx`.
  - The soft keyboard will remain closed when AI finishes typing, opening only when the user explicitly taps the input field.

---

## User Confirmation
Click **Proceed** to execute these changes immediately.
