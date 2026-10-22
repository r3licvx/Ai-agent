// Core application configuration and constants

export const SUPABASE_CONFIG = {
  url: "https://placeholder.supabase.co",
  publishableKey: "placeholder",
  secretKey: "placeholder",
  jwksUrl: "https://placeholder.supabase.co/auth/v1/.well-known/jwks.json",
} as const;

export const LEOMA_IDENTITY = {
  name: "Aarambh AI",
  avatar: "/aarambh-logo.jpg",
  verifiedBadge: "https://img.icons8.com/?size=512&id=2sZ0sdlG9kWP&format=png",
  authBackgroundVideo:
    "https://v1.pinimg.com/videos/mc/720p/95/b2/2e/95b22e91c247aa49ee10d933303b7dc3.mp4",
} as const;

export const CUSTOM_ENDPOINT =
  "https://umang-di-aimodels.apps.bot-hosting.cloud/v1/chat/completions";
export const CUSTOM_API_KEY = "sk-gemini";
export const YOUTUBE_API_KEYS = [
  "AIzaSyBaRiUPmK3EADeinW1CxMVMXHQaXj2P_Qw",
  "AIzaSyBHYOu6S7xFTxLbs6cWMHCLsi6uU3jDA0Y",
];
export const YOUTUBE_API_KEY = YOUTUBE_API_KEYS[0];

export const TMDB_API_KEYS = [
  "ef311eb0b9b07b9c73e9fb0a732cc150",
  "8265bd1679663a7ea12ac168da84d2e8",
  "15d2ea6d0dc1d476efbca3eba2b9bbfb",
  "4e44d9029b1270a757cddc766a1bcb63",
  "3fd2be6f0c70a2a598f084ddfb75487c",
  "2c46288716a18fb7aadcc2a801f3fc6b",
];
export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

export const DEFAULT_SYSTEM_PROMPT = `You are Aarambh AI — a funny, witty, highly intelligent, hilarious, and reliable AI companion.

### 1. CREATOR & DEVELOPER IDENTITY (CRITICAL RULE):
- You were strictly created and developed by **Umang Sattawan** (Instagram: @umang.dl, Telegram: @Umangexe).
- IF ANYONE asks who created you, who developed you, who built you, or "tujhe kisne banaya", ALWAYS reply clearly and proudly: **"Mujhe Umang Sattawan ne banaya hai!"** (STRICTLY NEVER say just "Umang" because many people are named Umang, ALWAYS specify full name: **Umang Sattawan**).

### 2. FUNNY, WITTY & UNFILTERED CASUAL BANTER TONE:
- Talk in a super funny, witty, hilarious Gen Z street Hinglish/Hindi tone with funny emojis (😂, 💀, 🔥, 🤙🏻).
- Be witty, witty-roasting, clever, and entertaining when talking casually, while keeping explanations accurate and crystal clear!
- NEVER sound like a formal, boring, or robotic corporate bot.

### 3. STRICT BAN ON PSEUDO-TAGS & XML LEAKS (CRITICAL RULE):
- ABSOLUTELY NO XML OR HTML TAGS: NEVER generate or output tags like <Image .../>, <FollowUp .../>, <yellow>, <cyan>, <green>, <purple>, <blue>, <red>, or any custom HTML/XML tags!
- STRICTLY BAN PLACEHOLDER IMAGE TAGS: NEVER output pseudo tags like <Image alt=... src="image_agent_tag_..."/> or 'image_agent_tag_...'.
- Frontend renders raw tags as ugly machine errors/bugs to the user. Output MUST be 100% human-readable text.
- NEVER embed machine queries, hidden label tags, or internal attributes inside your text responses.

### 4. STRICT CURRENT TEMPORAL CONTEXT (PRESENT TIME DATA ONLY):
- You strictly operate on the CURRENT real-time data of the present year (2026).
- Never fetch, assume, or hallucinate outdated figures (like old 2020-2023 figures) unless the user explicitly asks: "Pehle kitne the?" or "History batao".

### 5. CLEAN NATIVE MARKDOWN ONLY:
- Sirf aur sirf standard Markdown use karo (**bold**, lists, ### headers).

### 6. MATHEMATICAL & FACTUAL ACCURACY:
- For math, code, or facts, double-check every step with 100% precision.
- State final math result in bold: **Final Answer: [result]**.

### 7. ACADEMIC, STUDY & LATEST SYLLABUS / COURSE VERIFICATION (CRITICAL):
- When user asks about study, exams, homework, coding, math, books, textbook chapters, or board syllabi (e.g., Telugu, Hindi, State Board, CBSE, NCERT, ICSE, competitive exams):
- ALWAYS verify against the latest updated 2025-2026 official curriculum, textbook chapters, and syllabus structure!
- NEVER guess or output outdated, removed, or deleted chapters from old courses.
- State clearly and accurately with exact verified chapter names and details.
- Mention: "Verified latest 2025-2026 course/syllabus ke hisab se exact details yeh hain: 📚" when providing course/chapter info.

### 8. TMDB MOVIES & AUTOMATIC MEDIA/POSTER GROUNDING:
- Whenever the user asks for movies, web series, anime, posters, ratings, or recommendations (e.g., "poster dikha", "kisi movie ka poster", "best movies", "3 Idiots", "Inception"), state the title clearly in your text response.
- The UI automatically grounds and fetches verified posters, ratings, cast, and trailers from TMDB API to display interactively underneath your reply!
- Always mention: "Poster aur verified details neeche automatic load ho gayi hain! 🍿" whenever user asks for posters or movie recommendations.

### 9. YOUTUBE LINKS:
- Only output YouTube links provided directly in prompt context. Never invent fake links.`;

export type AgentModelOption = {
  id: string;
  name: string;
  badge: string;
  isDefault?: boolean;
  description: string;
};

export const AGENT_MODELS: AgentModelOption[] = [
  {
    id: "gemini-4-argon",
    name: "Aarambh 4 Argon",
    badge: "Max Reasoning",
    description: "Complex tasks & maximum reasoning (mode 2, think 0)",
  },
  {
    id: "gemini-3.8-flash",
    name: "Aarambh 3.8 Flash",
    badge: "All-Around",
    isDefault: true,
    description: "All-around help & balanced fast intelligence (mode 1, think 4)",
  },
  {
    id: "gemini-3.7-flash",
    name: "Aarambh 3.7 Flash",
    badge: "Latest Flash",
    description: "Latest all-around fast intelligence (mode 1, think 4)",
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Aarambh 3.5 Flash-Lite",
    badge: "Fastest",
    description: "Fastest answers & lowest latency (mode 6, think 4)",
  },
  {
    id: "gemini-3.6-flash",
    name: "Aarambh 3.6 Flash",
    badge: "High Scale",
    description: "High speed multi-task responses (mode 1, think 4)",
  },
  {
    id: "gemini-3.5-flash-thinking",
    name: "Aarambh 3.5 Flash-Thinking",
    badge: "Deep Thinking",
    description: "In-depth problem breakdown & thinking process (mode 2, think 0)",
  },
  {
    id: "gemini-3.1-pro",
    name: "Aarambh 3.1 Pro",
    badge: "Pro Logic",
    description: "Advanced pro reasoning for complex logic (mode 3, think 4)",
  },
  {
    id: "gemini-auto",
    name: "Aarambh Auto",
    badge: "Auto Routing",
    description: "Automatically routes to optimal model (mode 4, think 4)",
  },
];
