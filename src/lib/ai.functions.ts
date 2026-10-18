import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CUSTOM_ENDPOINT, CUSTOM_API_KEY, DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";

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

    const priorMsgs: ChatMsg[] = (data.history || []).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    const messages: ChatMsg[] = [
      { role: "system", content: systemInstruction },
      ...(data.displayName
        ? [{ role: "system" as const, content: `User's Name: ${data.displayName}` }]
        : []),
      ...priorMsgs,
      { role: "user", content: userPrompt || "Yo" },
    ];

    try {
      const response = await fetch(CUSTOM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CUSTOM_API_KEY}`,
        },
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
        /i cannot fulfill|i am unable to|as an ai|i cannot assist|decline to answer|safety guidelines|inappropriate content/i;
      if (refusalRegex.test(replyContent)) {
        const fallbacks = [
          `Abe bsdk 💀 ye kya Johnny Sins aur dark jokes ke chakkar mein seedha roast kar raha hai 😂! Bol na lodu aur kya scene hai aaj ka? 🤙🏻🔥`,
          `Arre bc 💀 itna dark joke marega toh mere circuit jal jayenge lodu! 😂 Bol kya chal raha hai, chal khul ke bata! 🤙🏻`,
          `Abe bsdk 💀 tu fir shuru ho gaya Johnny Sins style mein? 😂 Bol kya jaanna hai bhai, dhang se bol! 🔥`,
          `Abe saale 💀 itna savage mood mein kyu hai aaj? Chal bata aaj kiski vaat lagani hai! 😂🤙🏻`,
        ];
        replyContent = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      }

      if (!replyContent) {
        replyContent = "Abe bol na, kya bolna chahta hai?";
      }

      const now = Date.now();
      const assistantReply = {
        id: `reply-${now}`,
        role: "assistant" as const,
        content: replyContent,
        created_at: new Date().toISOString(),
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
      console.error("[Custom AI Endpoint Error]:", err);
      const now = Date.now();
      const fallbackReply = {
        id: `reply-${now}`,
        role: "assistant" as const,
        content:
          err instanceof Error
            ? `Bhai server pe error aagaya: ${err.message}`
            : "Server disconnect ho gaya re, thodi der baad try kar!",
        created_at: new Date().toISOString(),
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
