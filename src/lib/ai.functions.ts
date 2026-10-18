import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CUSTOM_ENDPOINT, CUSTOM_API_KEY, DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";
import {
  fetchTMDBTrending,
  fetchTMDBIndianTopMovies,
  findBestTMDBMatch,
  searchTMDBMedia,
  extractQueriedMediaFromUserPrompt,
  STUDY_OR_ACADEMIC_REGEX,
  HAS_MEDIA_KEYWORDS_REGEX,
  type TMDBMediaItem,
} from "@/lib/tmdb";

const InputSchema = z.object({
  content: z.string().default(""),
  model: z.string().optional(),
  displayName: z.string().optional(),
  customInstructions: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
      }),
    )
    .optional(),
});

type ChatMsg = {
  role: "system" | "user" | "assistant";
  content: string;
};

export const sendChatMessage = createServerFn({ method: "POST" })
  .validator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const selectedModel = data.model || "gemini-4-argon";
    const userPrompt = data.content.trim();
    const systemInstruction = data.customInstructions?.trim() || DEFAULT_SYSTEM_PROMPT;

    // 1. Strictly detect if user prompt is asking about study, academic, or non-entertainment topics
    const isStudyOrAcademic =
      STUDY_OR_ACADEMIC_REGEX.test(userPrompt) && !HAS_MEDIA_KEYWORDS_REGEX.test(userPrompt);

    // 2. Immediate previous message (check if user is in a direct movie follow-up conversation)
    const prevMsg = data.history?.slice(-1)[0]?.content || "";
    const isDirectMovieFollowUp =
      /(?:movie|film|cinema|series|web series|anime|tmdb|शो|फिल्म|मूवी)/i.test(prevMsg) &&
      /(?:best|top|सजेशन|बताओ|recommend|suggest|kya dekhu|kya dekhe|kuch batao|next)/i.test(
        userPrompt,
      );

    const hasEntertainmentIntent =
      !isStudyOrAcademic && (HAS_MEDIA_KEYWORDS_REGEX.test(userPrompt) || isDirectMovieFollowUp);

    let groundedTMDBItems: TMDBMediaItem[] = [];

    // ONLY ground TMDB if user inquiry has positive entertainment intent!
    if (hasEntertainmentIntent) {
      const isIndianTopMoviesQuery =
        /(?:hindi\s*movie|indian\s*movie|bollywood|tollywood|kollywood|south\s*movie|हिंदी\s*मूवी|भारतीय\s*फिल्म|बॉलीवुड|देसी|इंडिया\s*की\s*मूवी)/i.test(
          userPrompt,
        ) ||
        (/(?:india|indian|इंडिया|भारत|बॉलीवुड)/i.test(userPrompt) &&
          /(?:best|top|सजेशन|बताओ|मूवी|फिल्म)/i.test(userPrompt)) ||
        (/(?:इंडिया\s*के\s*लिए|हिंदी\s*में)/i.test(userPrompt) &&
          /(?:best|top|बताओ|सजेशन|मूवी|फिल्म)/i.test(userPrompt));

      const isTrendingQuery =
        !isIndianTopMoviesQuery &&
        /(?:trending|ट्रेन्डिंग|ट्रेंडिंग|popular|top\s*movies|top\s*5\s*movies|top\s*10\s*movies|best\s*movies|नई\s*फिल्में|हालिया\s*फिल्में|आज\s*की\s*ट्रेंडिंग|trending\s*movies|trending\s*series|what\s*to\s*watch|आज\s*की\s*मूवी|पांच\s*मूवी|टॉप\s*मूवी)/i.test(
          userPrompt,
        );

      if (isIndianTopMoviesQuery) {
        try {
          groundedTMDBItems = await fetchTMDBIndianTopMovies();
        } catch (err) {
          console.warn("Failed fetching Indian TMDB for AI grounding:", err);
        }
      } else if (isTrendingQuery) {
        try {
          groundedTMDBItems = await fetchTMDBTrending("all", "day");
        } catch (err) {
          console.warn("Failed fetching trending TMDB for AI grounding:", err);
        }
      } else {
        const queriedTitle = extractQueriedMediaFromUserPrompt(userPrompt);
        if (queriedTitle && queriedTitle.query) {
          try {
            const best = await findBestTMDBMatch(
              queriedTitle.query,
              undefined,
              queriedTitle.isAnime,
            );
            if (best) {
              groundedTMDBItems.push(best);
            }
          } catch (err) {
            console.warn("Failed fetching matched title for AI grounding:", err);
          }
        } else {
          // Dynamic search for specific genre or requirement (e.g. "Action movies", "Horror", "Comedy", "Anime")
          const cleanSearch = userPrompt
            .replace(
              /(?:batao|bataiye|suggest|recommend|best|top|kuch|achhi|achha|movie|movies|film|films|series)/gi,
              "",
            )
            .trim();
          if (cleanSearch.length >= 2) {
            try {
              const live = await searchTMDBMedia(cleanSearch, false);
              if (live.length > 0) {
                groundedTMDBItems = live.slice(0, 6);
              }
            } catch {
              // ignore
            }
          }
        }
      }
    }

    let tmdbGroundingPrompt = "";
    if (groundedTMDBItems.length > 0) {
      const formattedItems = groundedTMDBItems
        .slice(0, 8)
        .map((item, idx) => {
          const typeLabel =
            item.mediaType === "tv"
              ? item.isAnime
                ? "Anime Series"
                : "Web Series"
              : item.isAnime
                ? "Anime Film"
                : item.isAnimation
                  ? "Animation"
                  : "Movie";
          return `${idx + 1}. Title: ${item.title} (${item.year || "N/A"})
- Media Type: ${typeLabel}
- TMDB Rating: ⭐ ${item.voteAverage}/10 (${item.voteCount} votes)
- Key Cast: ${item.cast && item.cast.length > 0 ? item.cast.join(", ") : "Available on TMDB"}
- Director/Creator: ${item.directors && item.directors.length > 0 ? item.directors.join(", ") : "Available on TMDB"}
- Official YouTube Trailer: ${item.trailerUrl || "None"}
- Synopsis: ${item.overview.slice(0, 160)}...`;
        })
        .join("\n\n");

      tmdbGroundingPrompt = `\n\n### ⚡ VERIFIED REAL-TIME TMDB DATABASE GROUNDING (${isIndianQuery ? "INDIAN / BOLLYWOOD CINEMA" : "LIVE TMDB DATABASE"}) ⚡
Here is the 100% verified live TMDB data matching the user's inquiry:

${formattedItems}

MANDATORY INSTRUCTIONS FOR AARAMBH:
1. Base your recommendations or explanations directly on these verified TMDB titles. ${isIndianQuery ? "Since the user is asking for Indian cinema / 'इंडिया के लिए', prioritize these verified Indian masterpieces (e.g. 12th Fail, 3 Idiots, Drishyam, Dangal, Tumbbad)." : ""}
2. For each title, use the clean Curated Showcase format:
### [Index]. [Official English Title] ([Year])
* **The Hook:** [Crisp 1-line hook capturing the essence]
* **Cast & Crew:** [Mention the verified actors and directors from above]
* **Verdict:** ⭐ [Rating]/10
${groundedTMDBItems.some((i) => i.trailerUrl) ? "* **Official Trailer:** [Include the verified YouTube trailer URL from above]" : ""}
3. STRICTLY NEVER make up, invent, or guess fake YouTube links. ONLY use the verified trailer URLs provided directly above or omit. Guessed links are always broken/expired!
4. The user interface will automatically display verified posters, ratings, and YouTube trailer cards underneath your message.`;
    }

    const priorMsgs: ChatMsg[] = (data.history || []).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    const messages: ChatMsg[] = [
      { role: "system", content: `${systemInstruction}${tmdbGroundingPrompt}` },
      ...(data.displayName
        ? [{ role: "system" as const, content: `User's Name: ${data.displayName}` }]
        : []),
      ...priorMsgs,
      { role: "user", content: userPrompt || "Yo" },
    ];

    const controller = new AbortController();
    // Allow up to 45 seconds for deep reasoning models
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(CUSTOM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CUSTOM_API_KEY}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: selectedModel,
          messages,
          safety_settings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" },
          ],
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" },
          ],
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Service Error (${response.status}): ${errorText.slice(0, 150)}`);
      }

      const json = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };

      let replyContent = json.choices?.[0]?.message?.content?.trim() || "";

      // Clean reasoning or thinking tags if present in output
      replyContent = replyContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

      // Sanitize any hallucinated googleusercontent links and normalize broken markdown links
      replyContent = replyContent
        .replace(/https?:\/\/googleusercontent\.com\/[^\s)]+/gi, "")
        .replace(/\[([^\]]+)\]\s*\n\s*\((https?:\/\/[^\s)]+)\)/g, "[$1]($2)")
        .trim();

      // Intercept robot canned refusal responses and convert into in-character bro banter
      const refusalRegex =
        /i cannot fulfill|i am unable to|as an ai|i cannot assist|decline to answer|safety guidelines|inappropriate content|safety filters stepped in/i;
      if (refusalRegex.test(replyContent)) {
        const fallbacks = [
          `Abe bsdk 💀 itna savage/dark mood mein hai? Safety filter ne thoda break le liya 😂! Rephrase karke pooch bro! 🤙🏻🔥`,
          `Arre bc 💀 itna dark joke marega toh mere circuit aur safety filter dono jal jayenge! 😂 Bol aur kya scene hai! 🤙🏻`,
          `Abe bsdk 💀 tu fir shuru ho gaya? 😂 Bol kya jaanna hai bhai, thoda doosri bhasha mein bol! 🔥`,
          `Abe saale 💀 itna savage question kyu hai? Chal bata aur kis topic pe baat karni hai! 😂🤙🏻`,
        ];
        replyContent = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      }

      if (!replyContent) {
        replyContent = "Abe bol na, kya bolna chahta hai?";
      }

      const now = Date.now();

      // Only attach grounded TMDB items that were ACTUALLY mentioned or recommended in replyContent!
      const replyLower = replyContent.toLowerCase();
      const verifiedMentionedTMDBItems = groundedTMDBItems.filter((item) => {
        const titleLower = item.title.toLowerCase();
        const origLower = item.originalTitle?.toLowerCase();
        return replyLower.includes(titleLower) || (origLower && replyLower.includes(origLower));
      });

      const assistantReply = {
        id: `reply-${now}`,
        role: "assistant" as const,
        content: replyContent,
        created_at: new Date().toISOString(),
        tmdbItems: verifiedMentionedTMDBItems.length > 0 ? verifiedMentionedTMDBItems : undefined,
      };

      const userRow = {
        id: `user-${now}`,
        role: "user" as const,
        content: userPrompt,
        created_at: new Date().toISOString(),
      };

      return {
        replies: [assistantReply],
        userMessage: userRow,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      const now = Date.now();

      const isTimeout =
        err instanceof Error &&
        (err.name === "AbortError" ||
          err.message.includes("aborted") ||
          err.message.includes("timeout"));
      const isSafety =
        err instanceof Error && /safety|filter|inappropriate|blocked/i.test(err.message);

      let fallbackText = "";
      if (isTimeout) {
        fallbackText =
          "Arey bhai! Server thoda busy chal raha hai / response lene mein time lag gaya 😂! Phirse ek baar try kar bro, main taiyar hoon!";
      } else if (isSafety) {
        fallbackText =
          "Abe bsdk 💀 itna dark/sensitive pooch liya tune ki safety filter hil gaya 😂! Thoda ghuma ke doosri bhasha mein pooch bro!";
      } else {
        fallbackText =
          "Arey bhai! Network ya server pe thoda lafda ho gaya re 😂 Phirse try kar, main yahin hoon!";
      }

      const fallbackReply = {
        id: `reply-${now}`,
        role: "assistant" as const,
        content: fallbackText,
        created_at: new Date().toISOString(),
        tmdbItems: groundedTMDBItems.length > 0 ? groundedTMDBItems : undefined,
      };

      return {
        replies: [fallbackReply],
        userMessage: {
          id: `user-${now}`,
          role: "user" as const,
          content: userPrompt,
          created_at: new Date().toISOString(),
        },
      };
    }
  });

const TitleInputSchema = z.object({
  userMessage: z.string(),
  assistantReply: z.string().optional(),
});

export const generateChatTitle = createServerFn({ method: "POST" })
  .validator((input: unknown) => TitleInputSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const response = await fetch(CUSTOM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CUSTOM_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gemini-3.8-flash",
          messages: [
            {
              role: "system",
              content:
                "You are a short chat titler. Generate a clean, catchy, 2-4 word title in English or Hinglish summarizing the topic of the chat. Output ONLY the plain title text with no quotes, punctuation, or extra words.",
            },
            {
              role: "user",
              content: `User prompt: "${data.userMessage.slice(0, 200)}"\n${data.assistantReply ? `AI response snippet: "${data.assistantReply.slice(0, 150)}"` : ""}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        return { title: data.userMessage.trim().slice(0, 22) || "New Chat" };
      }

      const json = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };

      let rawTitle = json.choices?.[0]?.message?.content?.trim() || "";
      rawTitle = rawTitle.replace(/["'<>#`]/g, "").trim();

      if (!rawTitle || rawTitle.length > 32) {
        rawTitle = data.userMessage.trim().slice(0, 24);
      }

      return { title: rawTitle || "New Chat" };
    } catch {
      return { title: data.userMessage.trim().slice(0, 24) || "New Chat" };
    }
  });

const SuggestionsInputSchema = z.object({
  displayName: z.string().optional(),
  memoryTopics: z.array(z.string()).optional(),
  recentPrompts: z.array(z.string()).optional(),
});

export const generatePersonalizedSuggestions = createServerFn({ method: "POST" })
  .validator((input: unknown) => SuggestionsInputSchema.parse(input))
  .handler(async ({ data }) => {
    const name = data.displayName?.trim() || "Bhai";
    const topics = (data.memoryTopics || []).filter(Boolean).slice(-6);
    const prompts = (data.recentPrompts || []).filter(Boolean).slice(-4);

    const promptText = `User's Name: ${name}
User's Persistent Memory & Previous Chat Topics: ${topics.length > 0 ? topics.join(", ") : "First time user"}
Recent User Context: ${prompts.length > 0 ? prompts.join(" | ") : "No recent prompts"}

Task: Generate exactly 4 short, hilarious, personalized suggestion prompts in street Hinglish for ${name}.
Rules:
1. Each suggestion must be 4 to 8 words long, very funny, engaging or relatable Gen Z bro banter with emojis.
2. If there are previous chat topics/memories in the list, create 2-3 suggestions recalling, roasting, or checking on those past topics (e.g. asking how that topic went, giving a funny follow-up, or roasting them about it).
3. If no past topics, generate funny personalized roasts and conversation starters addressing ${name} directly.
4. Output ONLY a valid JSON array of 4 string items. Example: ["Suggestion 1", "Suggestion 2", "Suggestion 3", "Suggestion 4"]`;

    try {
      const response = await fetch(CUSTOM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CUSTOM_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gemini-3.8-flash",
          messages: [
            {
              role: "system",
              content:
                "You are an uncensored backbencher prompt generator. Always output ONLY a raw JSON array of 4 short funny Hinglish strings. No markdown, no explanations.",
            },
            {
              role: "user",
              content: promptText,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate: ${response.status}`);
      }

      const json = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const rawContent = json.choices?.[0]?.message?.content?.trim() || "";
      const match = rawContent.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          return { suggestions: parsed.slice(0, 4).map(String) };
        }
      }
      throw new Error("Invalid format");
    } catch {
      const fallbacks = [
        `${name} bhai ke life decisions pe roast 💀`,
        `Aaj ka kya gyaan hai bro? 🤙🏻`,
        topics.length > 0
          ? `${topics[topics.length - 1]} ka kya scene bana fir? 😂`
          : `Kal raat kya kaand kiya tune? 😂`,
        `Aisi savage line de jo sabki bolti band karde 🔥`,
      ];
      return { suggestions: fallbacks };
    }
  });
