import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CUSTOM_ENDPOINT, CUSTOM_API_KEY, DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";
import {
  fetchTMDBTrending,
  fetchTMDBIndianTopMovies,
  findBestTMDBMatch,
  searchTMDBMedia,
  extractQueriedMediaFromUserPrompt,
  extractMediaSearchQueries,
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

    const queriedTitle = extractQueriedMediaFromUserPrompt(userPrompt);

    const isExplicitGenericIndian =
      !queriedTitle &&
      (/(?:hindi\s*movie|indian\s*movie|bollywood|tollywood|kollywood|south\s*movie|हिंदी\s*मूवी|भारतीय\s*फिल्म|बॉलीवुड|देसी|इंडिया\s*की\s*मूवी)/i.test(
        userPrompt,
      ) ||
        (/(?:india|indian|इंडिया|भारत|बॉलीवुड)/i.test(userPrompt) &&
          /(?:best|top|सजेशन|बताओ|मूवी|फिल्म)/i.test(userPrompt)) ||
        (/(?:इंडिया\s*के\s*लिए|हिंदी\s*में)/i.test(userPrompt) &&
          /(?:best|top|बताओ|सजेशन|मूवी|फिल्म)/i.test(userPrompt)));

    const isIndianQuery = isExplicitGenericIndian;

    const isTrendingQuery =
      !queriedTitle &&
      !isIndianQuery &&
      /(?:trending|ट्रेन्डिंग|ट्रेंडिंग|popular|top\s*movies|top\s*5\s*movies|top\s*10\s*movies|best\s*movies|नई\s*फिल्में|हालिया\s*फिल्में|आज\s*की\s*ट्रेंडिंग|trending\s*movies|trending\s*series|what\s*to\s*watch|आज\s*की\s*मूवी|पांच\s*मूवी|टॉप\s*मूवी)/i.test(
        userPrompt,
      );

    // ONLY ground TMDB if user inquiry has positive entertainment intent!
    if (hasEntertainmentIntent) {
      if (queriedTitle && queriedTitle.query) {
        try {
          const best = await findBestTMDBMatch(queriedTitle.query, undefined, queriedTitle.isAnime);
          if (best) {
            groundedTMDBItems.push(best);
          }
        } catch (err) {
          console.warn("Failed fetching matched title for AI grounding:", err);
        }
      } else if (isIndianQuery) {
        try {
          const fetched = await fetchTMDBIndianTopMovies();
          if (fetched) groundedTMDBItems = fetched;
        } catch (err) {
          console.warn("Failed fetching Indian TMDB for AI grounding:", err);
        }
      } else if (isTrendingQuery) {
        try {
          const fetched = await fetchTMDBTrending("all", "day");
          if (fetched) groundedTMDBItems = fetched;
        } catch (err) {
          console.warn("Failed fetching trending TMDB for AI grounding:", err);
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

    const currentRealTimeDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const realTimeSystemPrompt = `\n\n### 🌐 LIVE REAL-TIME KNOWLEDGE & CURRENT DATE CONTEXT:
- Current System Date: ${currentRealTimeDate} (Year 2026)
- Automatically discuss current/latest 2026 events, movies, news, scores, tech updates, and world developments as live knowledge.
- Never state that you don't have real-time data or mention knowledge cutoff dates.`;

    const messages: ChatMsg[] = [
      {
        role: "system",
        content: `${systemInstruction}${tmdbGroundingPrompt}${realTimeSystemPrompt}`,
      },
      ...(data.displayName
        ? [{ role: "system" as const, content: `User's Name: ${data.displayName}` }]
        : []),
      ...priorMsgs,
      { role: "user", content: userPrompt || "Yo" },
    ];

    let replyContent = "";
    const now = Date.now();
    const groundedResults = groundedTMDBItems;

    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 40000);

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
            tools: [{ googleSearch: {} }],
          }),
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(`AI Service status ${response.status}: ${errorText.slice(0, 100)}`);
        }

        const json = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
        };

        replyContent = json.choices?.[0]?.message?.content?.trim() || "";
        if (replyContent) {
          break; // successfully got content
        }
      } catch (err) {
        clearTimeout(timeoutId);
        lastErr = err;
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    }

    if (!replyContent) {
      if (lastErr) {
        console.error("AI service completion failed after retries:", lastErr);
        throw lastErr instanceof Error
          ? lastErr
          : new Error("AI service temporary connection error. Please tap Regenerate.");
      }
      replyContent = "Main aapki kya madad kar sakta hoon? Kripya apna sawal poochein.";
    }

    // Clean reasoning or thinking tags if present in output
    replyContent = replyContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    // Clean pseudo tags like <Image .../>, image_agent_tag_..., <FollowUp .../>, and HTML color tags
    replyContent = replyContent
      .replace(/<Image\b[^>]*>(?:[\s\S]*?<\/Image>)?/gi, "")
      .replace(/<Image\b[^>]*\/>/gi, "")
      .replace(/<image_agent_tag[^>]*>/gi, "")
      .replace(/image_agent_tag_\d+/gi, "")
      .replace(
        /<FollowUp\s+label=(?:"|')([^"']+)(?:"|')\s+query=(?:"|')([^"']+)(?:"|')\s*\/?>/gi,
        (_, label: string) => `\n\n${label}`,
      )
      .replace(/<FollowUp[^>]*\/?>/gi, "")
      .replace(/<FollowUp[^>]*>[\s\S]*?<\/FollowUp>/gi, "")
      .replace(
        /<\/?(?:red|green|yellow|blue|purple|orange|pink|cyan|emerald|amber|rose|FollowUp|query|label|custom|style|tag|color)[^>]*>/gi,
        "",
      )
      .replace(/\[\/?(?:red|green|yellow|blue|purple|orange|pink|cyan|emerald|amber|rose)\]/gi, "");

    // Sanitize any hallucinated googleusercontent links and normalize broken markdown links
    replyContent = replyContent
      .replace(/https?:\/\/googleusercontent\.com\/[^\s)]+/gi, "")
      .replace(/\[([^\]]+)\]\s*\n\s*\((https?:\/\/[^\s)]+)\)/g, "[$1]($2)")
      .trim();

    // Clean handling of safety refusals
    const refusalRegex =
      /i cannot fulfill|i am unable to|as an ai|i cannot assist|decline to answer|safety guidelines|inappropriate content|safety filters stepped in/i;
    if (refusalRegex.test(replyContent)) {
      replyContent =
        "Main is vishay par directly jankari provide nahi kar sakta safety guidelines ke anusaar. Kripya kisi doosre sawal ya topic par charcha karein.";
    }

    // Extract media queries from both userPrompt and replyContent
    const userMediaSearch = extractQueriedMediaFromUserPrompt(userPrompt);
    const extractedQueries = extractMediaSearchQueries(replyContent, userPrompt);

    const finalTMDBItems: TMDBMediaItem[] = [];
    const seenIds = new Set<number>();

    // 1. Direct user title query match (e.g. "Dhurandhar", "Love Insurance Kompany", "Inception")
    if (userMediaSearch && userMediaSearch.query) {
      try {
        const directMatch = await findBestTMDBMatch(
          userMediaSearch.query,
          userMediaSearch.year,
          userMediaSearch.isAnime,
        );
        if (directMatch && !seenIds.has(directMatch.id)) {
          seenIds.add(directMatch.id);
          finalTMDBItems.push(directMatch);
        }
      } catch (err) {
        console.warn("Failed fetching direct user TMDB match:", err);
      }
      // When a specific title was searched by the user, DO NOT add random extracted titles or generic lists!
    } else {
      // 2. Add grounded results if relevant (when no specific single title was asked)
      for (const item of groundedResults) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          finalTMDBItems.push(item);
        }
      }

      // 3. Search TMDB for recommended titles extracted from AI response text
      if (finalTMDBItems.length < 6 && extractedQueries.length > 0) {
        for (const q of extractedQueries) {
          if (finalTMDBItems.length >= 8) break;
          try {
            const match = await findBestTMDBMatch(q.query, q.year, q.isAnime);
            if (match && !seenIds.has(match.id)) {
              seenIds.add(match.id);
              finalTMDBItems.push(match);
            }
          } catch {
            // ignore
          }
        }
      }

      // 4. ONLY if no specific title was requested AND user explicitly asked for generic recommendations ("best movies", "top trending shows"):
      const isExplicitGenericList =
        /^(?:top|best|trending|popular|new)\s*(?:movies?|films?|series|shows?|bollywood|hollywood|indian)/i.test(
          userPrompt.trim(),
        ) ||
        /(?:sabse|kuch)\s*(?:acchi|best|top)\s*(?:movie|film|series|movies|films)\s*(?:batao|suggest|recommend)/i.test(
          userPrompt,
        );

      if (finalTMDBItems.length === 0 && isExplicitGenericList) {
        if (isIndianQuery) {
          try {
            const indian = await fetchTMDBIndianTopMovies();
            for (const item of indian.slice(0, 6)) {
              if (!seenIds.has(item.id)) {
                seenIds.add(item.id);
                finalTMDBItems.push(item);
              }
            }
          } catch {
            // ignore
          }
        } else if (isTrendingQuery) {
          try {
            const trending = await fetchTMDBTrending("all", "day");
            for (const item of trending.slice(0, 6)) {
              if (!seenIds.has(item.id)) {
                seenIds.add(item.id);
                finalTMDBItems.push(item);
              }
            }
          } catch {
            // ignore
          }
        }
      }
    }

    const assistantReply = {
      id: `reply-${now}`,
      role: "assistant" as const,
      content: replyContent,
      created_at: new Date().toISOString(),
      tmdbItems: finalTMDBItems.length > 0 ? finalTMDBItems : undefined,
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

const NameValidationSchema = z.object({
  name: z.string(),
});

export const validateDisplayNameWithAI = createServerFn({ method: "POST" })
  .validator((input: unknown) => NameValidationSchema.parse(input))
  .handler(async ({ data }) => {
    const raw = data.name.trim();

    // 1. Instant local validation checks
    if (!raw || raw.length < 2) {
      return {
        isValid: false,
        reason: "Please enter a valid real name with at least 2 characters.",
      };
    }

    if (raw.length > 30) {
      return {
        isValid: false,
        reason: "Name is too long. Please enter a concise name under 30 characters.",
      };
    }

    // Reject symbols, punctuation, or slashes
    if (/[,/\\@#$%*+=<>?!_{}[\]~^;:|"`]/.test(raw)) {
      return {
        isValid: false,
        reason: "Symbols, slashes, or punctuation are not allowed. Please enter a real name.",
      };
    }

    // Reject pure numbers
    if (/^\d+$/.test(raw)) {
      return {
        isValid: false,
        reason: "Numbers are not allowed as a name. Please enter your real name.",
      };
    }

    const lower = raw.toLowerCase();
    const junkWords = new Set([
      "hello",
      "hi",
      "hey",
      "hy",
      "hlo",
      "hlw",
      "bro",
      "bhai",
      "test",
      "admin",
      "user",
      "null",
      "undefined",
      "asdf",
      "qwerty",
      "haha",
      "lol",
      "rofl",
      "no",
      "yes",
      "ok",
      "okay",
      "namaste",
      "welcome",
      "guest",
      "none",
      "anon",
      "anonymous",
      "123",
      "fake",
      "someone",
      "nobody",
      "xyz",
      "abc",
      "temp",
      "dot",
      "comma",
      "space",
      "slash",
      "login",
      "sign",
      "signup",
      "pass",
      "password",
      "name",
      "yourname",
      "enter",
      "kuchbhi",
      "kuch",
      "ghanta",
      "system",
      "bot",
      "ai",
      "aarambh",
      "gemini",
    ]);

    if (junkWords.has(lower) || lower.split(/\s+/).some((w) => junkWords.has(w))) {
      return {
        isValid: false,
        reason: `"${raw}" is casual chatter, not a real name. Please enter a proper name (e.g. Alex, Rahul, Sameer).`,
      };
    }

    // 2. AI validation check for subtle keyboard mash or non-names
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
                'You are a strict real name validator. Evaluate if the input string is a valid human first/last/full name or nickname. Reject keyboard mash (e.g., asdfgh, hshshs, dfghjk), random chatter (e.g. "kya haal", "nothing", "anything", "no name"), offensive gibberish, or nonsense words. Output ONLY JSON: {"isValid": true/false, "reason": "Short clear English message if invalid"}.',
            },
            {
              role: "user",
              content: `Input name to validate: "${raw}"`,
            },
          ],
        }),
      });

      if (response.ok) {
        const json = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = json.choices?.[0]?.message?.content?.trim() || "";
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]) as { isValid?: boolean; reason?: string };
          if (parsed.isValid === false) {
            return {
              isValid: false,
              reason:
                parsed.reason || "Invalid name detected. Please enter a legitimate human name.",
            };
          }
        }
      }
    } catch (err) {
      console.warn("AI name validation fallback:", err);
    }

    // Clean formatting
    const cleanName = raw
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    return { isValid: true, cleanName };
  });
