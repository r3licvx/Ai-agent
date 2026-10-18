import { TMDB_API_KEYS, TMDB_IMAGE_BASE_URL } from "@/lib/constants";

export type TMDBMediaItem = {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  originalTitle?: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate?: string;
  year?: string;
  voteAverage: number;
  voteCount: number;
  originalLanguage?: string;
  isAnime?: boolean;
  isAnimation?: boolean;
  cast?: string[];
  directors?: string[];
  trailerUrl?: string | null;
};

export type MediaSearchQuery = {
  query: string;
  year?: string;
  isAnime: boolean;
};

// Memory cache for TMDB queries
const searchMemoryCache = new Map<string, TMDBMediaItem[]>();

// Known anime keywords to identify genuine Japanese anime
const KNOWN_ANIME_KEYWORDS = [
  "anime",
  "naruto",
  "bleach",
  "one piece",
  "dragon ball",
  "attack on titan",
  "shingeki",
  "jujutsu",
  "demon slayer",
  "kimetsu",
  "death note",
  "my hero academia",
  "boku no hero",
  "chainsaw man",
  "fullmetal alchemist",
  "hunter x hunter",
  "tokyo ghoul",
  "sword art online",
  "evangelion",
  "cowboy bebop",
  "steins;gate",
  "vinland saga",
  "solo leveling",
  "spy x family",
  "cyberpunk edgerunners",
  "frieren",
  "blue lock",
  "kaiju no. 8",
  "dandadan",
];

// Hindi / Devanagari common movie and series title translations for TMDB indexing
const HINDI_TITLE_MAP: Record<string, string> = {
  "लव इंश्योरेंस कंपनी": "Love Insurance Kompany",
  "लव इंश्योरेंस": "Love Insurance Kompany",
  "लव इन्शुरन्स कंपनी": "Love Insurance Kompany",
  "स्ट्रेंजर थिंग्स": "Stranger Things",
  दृश्यम: "Drishyam",
  "दृश्यम 2": "Drishyam 2",
  द्रिश्यम: "Drishyam",
  "द्रिश्यम 2": "Drishyam 2",
  "12th फेल": "12th Fail",
  "12वीं फेल": "12th Fail",
  "बारहवीं फेल": "12th Fail",
  "१२वीं फेल": "12th Fail",
  "3 इडियट्स": "3 Idiots",
  "थ्री इडियट्स": "3 Idiots",
  "थ्री इडियट": "3 Idiots",
  "3 इडियट": "3 Idiots",
  दंगल: "Dangal",
  शोले: "Sholay",
  तुम्बाड: "Tumbbad",
  तुम्बाड़: "Tumbbad",
  स्त्री: "Stree",
  "स्त्री 2": "Stree 2",
  "तारे ज़मीन पर": "Taare Zameen Par",
  "गैंग्स ऑफ वासेपुर": "Gangs of Wasseypur",
  "चक दे इंडिया": "Chak De! India",
  लगान: "Lagaan",
  स्वदेस: "Swades",
  "हेरा फेरी": "Hera Pheri",
  "फिर हेरा फेरी": "Phir Hera Pheri",
  "अंदाज अपना अपना": "Andaz Apna Apna",
  "बजरंगी भाईजान": "Bajrangi Bhaijaan",
  कंतारा: "Kantara",
  विक्रम: "Vikram",
  जेलर: "Jailer",
  लियो: "Leo",
  पुष्पा: "Pushpa",
  "पुष्पा 2": "Pushpa 2: The Rule",
  जवान: "Jawan",
  पठान: "Pathaan",
  डंकी: "Dunki",
  कल्कि: "Kalki 2898 AD",
  सालार: "Salaar",
  केजीएफ: "K.G.F: Chapter 1",
  "केजीएफ 2": "K.G.F: Chapter 2",
  आरआरआर: "RRR",
  बाहुबली: "Baahubali",
  "बाहुबली 2": "Baahubali 2",
  पंचायत: "Panchayat",
  मिर्जापुर: "Mirzapur",
  "सेक्रेड गेम्स": "Sacred Games",
  "द फैमिली मैन": "The Family Man",
  "फैमिली मैन": "The Family Man",
  असुर: "Asur",
  फर्जी: "Farzi",
  "पाताल लोक": "Paatal Lok",
  "कोटा फैक्ट्री": "Kota Factory",
  गुल्लक: "Gullak",
  स्कैम: "Scam 1992",
  "स्कैम 1992": "Scam 1992",
  महाराजा: "Maharaja",
  "लापता लेडीज": "Laapataa Ladies",
  "लापता लेडीज़": "Laapataa Ladies",
  "आर्टिकल 370": "Article 370",
  "सैम बहादुर": "Sam Bahadur",
  "द कश्मीर फाइल्स": "The Kashmir Files",
  "कश्मीर फाइल्स": "The Kashmir Files",
  शैतान: "Shaitaan",
  "भूल भुलैया": "Bhool Bhulaiyaa",
  "भूल भुलैया 2": "Bhool Bhulaiyaa 2",
  "भूल भुलैया 3": "Bhool Bhulaiyaa 3",
  सिंघम: "Singham",
  "सिंघम अगेन": "Singham Again",
  छावा: "Chhaava",
  "कबीर सिंह": "Kabir Singh",
  उरी: "Uri: The Surgical Strike",
  अंधाधुन: "Andhadhun",
  "मनी हाइस्ट": "Money Heist",
  "गेम ऑफ थ्रोन्स": "Game of Thrones",
  "ब्रेकिंग बैड": "Breaking Bad",
  डार्क: "Dark",
  "द बॉयज": "The Boys",
  लोकी: "Loki",
  "डेथ नोट": "Death Note",
  नारुतो: "Naruto",
  "अटैक ऑन टाइटन": "Attack on Titan",
  "जुजुत्सु काइसन": "Jujutsu Kaisen",
  "डेमन स्लेयर": "Demon Slayer",
};

// Helper to resolve search queries: handles Hindi titles, parentheses translations, etc.
export function resolveSearchTerms(rawQuery: string): string[] {
  const terms: string[] = [];
  const trimmed = rawQuery.trim();
  if (!trimmed) return terms;

  // 1. If query contains English in parentheses e.g. "दृश्यम (Drishyam)" or "लव इंश्योरेंस कंपनी (Love Insurance Kompany)"
  const parenMatch = /\(([^)]+)\)/.exec(trimmed);
  if (parenMatch && /[a-zA-Z0-9]/.test(parenMatch[1])) {
    const extracted = parenMatch[1].trim();
    if (extracted.length >= 2 && !terms.includes(extracted)) {
      terms.push(extracted);
    }
  }

  // 2. Direct match from Hindi title dictionary
  const lower = trimmed.toLowerCase();
  for (const [hindi, english] of Object.entries(HINDI_TITLE_MAP)) {
    if (lower === hindi || lower.includes(hindi)) {
      if (!terms.includes(english)) {
        terms.push(english);
      }
    }
  }

  // 3. Phonetic Hindi words replacement
  let phonetics = trimmed;
  if (/लव/i.test(phonetics)) phonetics = phonetics.replace(/लव/gi, "Love");
  if (/इंश्योरेंस|इन्शुरन्स/i.test(phonetics))
    phonetics = phonetics.replace(/इंश्योरेंस|इन्शुरन्स/gi, "Insurance");
  if (/कंपनी|कम्पनी/i.test(phonetics)) phonetics = phonetics.replace(/कंपनी|कम्पनी/gi, "Kompany");
  if (/कॉर्पोरेशन/i.test(phonetics)) phonetics = phonetics.replace(/कॉर्पोरेशन/gi, "Corporation");
  if (/दृश्यम|द्रिश्यम/i.test(phonetics))
    phonetics = phonetics.replace(/दृश्यम|द्रिश्यम/gi, "Drishyam");
  if (/फेल/i.test(phonetics)) phonetics = phonetics.replace(/फेल/gi, "Fail");
  if (/इडियट्स|इडियट/i.test(phonetics)) phonetics = phonetics.replace(/इडियट्स|इडियट/gi, "Idiots");

  if (phonetics !== trimmed && /[a-zA-Z]/.test(phonetics)) {
    const cleanedPhonetics = phonetics.replace(/[^\w\s-]/g, "").trim();
    if (cleanedPhonetics && !terms.includes(cleanedPhonetics)) {
      terms.push(cleanedPhonetics);
    }
  }

  // 4. Clean raw query (strip symbols, numbers if any)
  const cleanedRaw = trimmed
    .replace(/^[#0-9.\s]+/, "")
    .replace(/\([0-9]{4}\)/, "")
    .trim();
  if (cleanedRaw && !terms.includes(cleanedRaw)) {
    terms.push(cleanedRaw);
  }

  return terms;
}

// Helper to query TMDB API with automatic failover through the 6 API keys
export async function fetchTMDBWithFallback(
  buildUrl: (apiKey: string) => string,
): Promise<Response | null> {
  for (let i = 0; i < TMDB_API_KEYS.length; i++) {
    const key = TMDB_API_KEYS[i];
    try {
      const url = buildUrl(key);
      const res = await fetch(url);
      if (res.ok) {
        return res;
      }
      if (res.status === 429 || res.status === 401) {
        console.warn(`TMDB API Key at index ${i} failed (${res.status}). Trying fallback key...`);
        continue;
      }
      return res;
    } catch (err) {
      console.warn(`TMDB API request failed on key index ${i}:`, err);
    }
  }
  return null;
}

// Transform raw TMDB object into standardized TMDBMediaItem
function transformTMDBItem(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any,
  forceAnime = false,
): TMDBMediaItem | null {
  if (!item) return null;

  const isMovie = item.media_type === "movie" || (!item.media_type && !!item.title);
  const isTv = item.media_type === "tv" || (!item.media_type && !!item.name);

  if (!isMovie && !isTv) return null;

  const title = item.title || item.name;
  if (!title) return null;

  const date = item.release_date || item.first_air_date || "";
  const year = date ? date.split("-")[0] : undefined;

  // Genuine Anime: Japanese origin ("ja") AND animation genre (16)
  const isJapanese = item.original_language?.toLowerCase() === "ja";
  const hasAnimationGenre = item.genre_ids?.includes(16) ?? false;
  const isAnime = forceAnime || (isJapanese && hasAnimationGenre);
  const isAnimation = hasAnimationGenre && !isAnime;

  return {
    id: item.id,
    mediaType: isMovie ? "movie" : "tv",
    title,
    originalTitle: item.original_title || item.original_name,
    overview: item.overview || "No overview available.",
    posterPath: item.poster_path ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}` : null,
    backdropPath: item.backdrop_path ? `${TMDB_IMAGE_BASE_URL}${item.backdrop_path}` : null,
    releaseDate: date,
    year,
    voteAverage:
      typeof item.vote_average === "number" ? Math.round(item.vote_average * 10) / 10 : 0,
    voteCount: item.vote_count || 0,
    originalLanguage: item.original_language?.toUpperCase() || "",
    isAnime,
    isAnimation,
  };
}

// Search TMDB across movies and TV series with intelligent title-relevance ranking
export async function searchTMDBMedia(
  query: string,
  forceAnime = false,
  targetYear?: string,
): Promise<TMDBMediaItem[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  const searchCandidates = resolveSearchTerms(query);
  if (searchCandidates.length === 0) searchCandidates.push(query);

  const cacheKey = `${forceAnime ? "anime_" : ""}${cleanQuery}_${targetYear || ""}`;

  // Check in-memory cache
  if (searchMemoryCache.has(cacheKey)) {
    return searchMemoryCache.get(cacheKey)!;
  }

  // Check browser localStorage cache
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(`tmdb_q_${cacheKey}`);
      if (cached) {
        const parsed = JSON.parse(cached) as TMDBMediaItem[];
        searchMemoryCache.set(cacheKey, parsed);
        return parsed;
      }
    } catch {
      // cache storage failure ignored
    }
  }

  for (const term of searchCandidates) {
    try {
      const res = await fetchTMDBWithFallback(
        (key) =>
          `https://api.themoviedb.org/3/search/multi?api_key=${key}&query=${encodeURIComponent(
            term,
          )}&include_adult=false&language=en-US&page=1`,
      );

      if (res) {
        const data = await res.json();
        const results = (data.results || []) as Array<
          Parameters<typeof transformTMDBItem>[0] & { genre_ids?: number[]; popularity?: number }
        >;

        if (results.length > 0) {
          const items: TMDBMediaItem[] = [];

          for (const raw of results) {
            // If explicit anime is requested: filter strictly for animation or Japanese origin
            if (forceAnime) {
              const isAnimeMatch =
                raw.genre_ids?.includes(16) || raw.original_language?.toLowerCase() === "ja";
              if (!isAnimeMatch) continue;
            }

            const transformed = transformTMDBItem(raw, forceAnime);
            if (transformed && (transformed.posterPath || transformed.backdropPath)) {
              items.push(transformed);
            }
          }

          if (items.length > 0) {
            // Intelligent Sorting:
            // 1. Exact title match bonus
            // 2. Year match bonus
            // 3. Vote count & popularity weight
            const termLower = term.toLowerCase();
            items.sort((a, b) => {
              const aTitle = a.title.toLowerCase();
              const bTitle = b.title.toLowerCase();

              let scoreA = 0;
              let scoreB = 0;

              if (aTitle === termLower) scoreA += 100000;
              if (bTitle === termLower) scoreB += 100000;

              if (aTitle.startsWith(termLower)) scoreA += 50000;
              if (bTitle.startsWith(termLower)) scoreB += 50000;

              if (targetYear) {
                if (a.year === targetYear) scoreA += 30000;
                if (b.year === targetYear) scoreB += 30000;
              }

              scoreA += Math.min(a.voteCount, 25000);
              scoreB += Math.min(b.voteCount, 25000);

              return scoreB - scoreA;
            });

            // Cache & return top matches
            const finalItems = items.slice(0, 10);
            searchMemoryCache.set(cacheKey, finalItems);

            if (typeof window !== "undefined") {
              try {
                localStorage.setItem(`tmdb_q_${cacheKey}`, JSON.stringify(finalItems));
              } catch {
                // ignore
              }
            }

            return finalItems;
          }
        }
      }
    } catch (err) {
      console.warn(`Failed search for term "${term}":`, err);
    }
  }

  return [];
}

// Fetch live cast, creators/directors, and verified official YouTube trailer from TMDB
export async function fetchTMDBDetailsAndCredits(
  id: number,
  mediaType: "movie" | "tv",
): Promise<{ cast: string[]; creators: string[]; trailerUrl: string | null }> {
  try {
    const res = await fetchTMDBWithFallback(
      (key) =>
        `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${key}&append_to_response=credits,videos`,
    );
    if (!res) return { cast: [], creators: [], trailerUrl: null };

    const data = await res.json();
    const cast: string[] = (data.credits?.cast || [])
      .slice(0, 5)
      .map((c: { name: string }) => c.name);

    const creators: string[] = [];
    if (Array.isArray(data.created_by)) {
      for (const cr of data.created_by) {
        if (cr.name) creators.push(cr.name);
      }
    }
    if (creators.length === 0 && Array.isArray(data.credits?.crew)) {
      for (const cr of data.credits.crew) {
        if (cr.job === "Director" || cr.job === "Writer") {
          creators.push(cr.name);
          if (creators.length >= 2) break;
        }
      }
    }

    let trailerUrl: string | null = null;
    if (Array.isArray(data.videos?.results)) {
      const bestVideo =
        data.videos.results.find(
          (v: { site?: string; type?: string; official?: boolean; key?: string }) =>
            v.site === "YouTube" && v.official && (v.type === "Trailer" || v.type === "Teaser"),
        ) ||
        data.videos.results.find(
          (v: { site?: string; type?: string; key?: string }) =>
            v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"),
        ) ||
        data.videos.results.find((v: { site?: string; key?: string }) => v.site === "YouTube");

      if (bestVideo?.key) {
        trailerUrl = `https://www.youtube.com/watch?v=${bestVideo.key}`;
      }
    }

    return { cast, creators, trailerUrl };
  } catch (err) {
    console.warn(`Failed to fetch credits/videos for ${mediaType} ${id}:`, err);
    return { cast: [], creators: [], trailerUrl: null };
  }
}

// Fetch live Trending movies and TV series directly from TMDB
export async function fetchTMDBTrending(
  mediaType: "all" | "movie" | "tv" = "all",
  timeWindow: "day" | "week" = "day",
): Promise<TMDBMediaItem[]> {
  const cacheKey = `trending_${mediaType}_${timeWindow}`;
  if (searchMemoryCache.has(cacheKey)) {
    return searchMemoryCache.get(cacheKey)!;
  }

  try {
    const res = await fetchTMDBWithFallback(
      (key) => `https://api.themoviedb.org/3/trending/${mediaType}/${timeWindow}?api_key=${key}`,
    );
    if (!res) return [];

    const data = await res.json();
    const results = (data.results || []) as Array<Parameters<typeof transformTMDBItem>[0]>;
    const items: TMDBMediaItem[] = [];

    for (const raw of results.slice(0, 10)) {
      const transformed = transformTMDBItem(raw, false);
      if (transformed && (transformed.posterPath || transformed.backdropPath)) {
        items.push(transformed);
      }
    }

    // Enrich top items with credits & official trailer
    await Promise.all(
      items.slice(0, 5).map(async (item) => {
        const extra = await fetchTMDBDetailsAndCredits(item.id, item.mediaType);
        item.cast = extra.cast;
        item.directors = extra.creators;
        item.trailerUrl = extra.trailerUrl;
      }),
    );

    searchMemoryCache.set(cacheKey, items);
    return items;
  } catch (err) {
    console.warn("Failed to fetch trending from TMDB:", err);
    return [];
  }
}

// Fetch top rated & trending Indian movies from TMDB
export async function fetchTMDBIndianTopMovies(): Promise<TMDBMediaItem[]> {
  const cacheKey = "indian_top_movies_v2";
  if (searchMemoryCache.has(cacheKey)) {
    return searchMemoryCache.get(cacheKey)!;
  }

  const items: TMDBMediaItem[] = [];
  const seenIds = new Set<number>();

  // Curated list of undisputed Indian masterworks to ensure accurate matches
  const coreIndianTitles = [
    { title: "12th Fail", year: "2023" },
    { title: "3 Idiots", year: "2009" },
    { title: "Drishyam", year: "2015" },
    { title: "Dangal", year: "2016" },
    { title: "Tumbbad", year: "2018" },
    { title: "Gangs of Wasseypur", year: "2012" },
    { title: "Sholay", year: "1975" },
    { title: "Taare Zameen Par", year: "2007" },
  ];

  for (const c of coreIndianTitles) {
    try {
      const match = await findBestTMDBMatch(c.title, c.year, false);
      if (match && !seenIds.has(match.id)) {
        seenIds.add(match.id);
        items.push(match);
      }
    } catch {
      // ignore
    }
  }

  searchMemoryCache.set(cacheKey, items);
  return items;
}

// Find single best match for a recommended title and enrich with credits & trailer
export async function findBestTMDBMatch(
  title: string,
  year?: string,
  forceAnime = false,
): Promise<TMDBMediaItem | null> {
  const items = await searchTMDBMedia(title, forceAnime, year);
  if (items.length === 0) return null;

  let best: TMDBMediaItem = items[0];
  if (year) {
    const matchYear = items.find((i) => i.year === year);
    if (matchYear) best = matchYear;
  }

  if (!best.cast || best.cast.length === 0) {
    const extra = await fetchTMDBDetailsAndCredits(best.id, best.mediaType);
    best.cast = extra.cast;
    best.directors = extra.creators;
    best.trailerUrl = extra.trailerUrl;
  }

  return best;
}

// Clean user prompt to extract queried media title (e.g. "Stranger Things के बारे में बताओ" -> "Stranger Things")
export function extractQueriedMediaFromUserPrompt(userPrompt: string): MediaSearchQuery | null {
  if (!userPrompt) return null;
  const clean = userPrompt.trim();

  // Strip common conversational Hindi/English question prefixes and suffixes
  const candidate = clean
    .replace(
      /(?:tell me about|what is|how is|explain|review|details on|recommend|suggest|kaisa hai|kaisi hai|ke bare me batao|ke baare me batao|ke baare mein batao|ke baare me detail|ke bare me|kaisa show hai|kya hai)/gi,
      "",
    )
    .replace(/[?।!.,]/g, "")
    .trim();

  // If candidate is a generic question or discovery inquiry, do NOT treat as a title!
  const isGeneric =
    /^(?:top\s*movies?|best\s*movies?|trending\s*movies?|new\s*movies?|movies?\s*list|what\s*to\s*watch|टॉप\s*मूवी|टॉप\s*फिल्में|बेस्ट\s*मूवी|बेस्ट\s*फिल्में|मूवी\s*बताओ|फिल्में\s*बताओ|इंडिया\s*के\s*लिए|इंडिया\s*की\s*मूवी|बॉलीवुड\s*की\s*मूवी|हिंदी\s*मूवी|ट्रेन्डिंग|ट्रेंडिंग|आज\s*की\s*मूवी|पांच\s*मूवी|5\s*मूवी|10\s*मूवी|top\s*5|top\s*10|इंडिया\s*के\s*लिए\s*बेस्ट|बेस्ट\s*बताओ|टॉप\s*बताओ|best\s*बताओ)$/i.test(
      candidate,
    );
  if (isGeneric) {
    return null;
  }

  // If candidate is a known title or transliterated
  for (const [hindi, english] of Object.entries(HINDI_TITLE_MAP)) {
    if (candidate.toLowerCase().includes(hindi)) {
      const isAnime = KNOWN_ANIME_KEYWORDS.some((k) => english.toLowerCase().includes(k));
      return { query: english, isAnime };
    }
  }

  if (candidate.length >= 2 && candidate.length <= 40) {
    const isAnime =
      /(?:anime|manga|एनीमे)/i.test(clean) ||
      KNOWN_ANIME_KEYWORDS.some((k) => candidate.toLowerCase().includes(k));
    return { query: candidate, isAnime };
  }

  return null;
}

// Extract recommended titles from AI output (Style A headings, tables, numbered lists, bullet lists, or bold titles)
export function extractMediaSearchQueries(text: string, userPrompt?: string): MediaSearchQuery[] {
  if (!text && !userPrompt) return [];

  const queries = new Map<string, { year?: string; isAnime: boolean }>();

  // 1. If user asked about a specific title in their prompt (e.g. "Stranger Things", "12th Fail"), include it
  if (userPrompt) {
    const directUserQuery = extractQueriedMediaFromUserPrompt(userPrompt);
    if (directUserQuery && directUserQuery.query) {
      queries.set(directUserQuery.query, {
        isAnime: directUserQuery.isAnime,
      });
    }
  }

  const ignoreWords =
    /^(?:the hook|why it hits|key specs|verdict|specs|cast & crew|lead cast|director|format|style|the curated|the quick|actionable|mathematical|youtube|creator|rules|step \d+|step|note|warning|pro tip|summary|final answer|name|title|score|best for|vibe|points?|hook)$/i;

  // Helper to add resolved candidate
  const addCandidate = (raw: string, year?: string) => {
    let title = raw.trim();
    if (!title || title.length < 2) return;

    // Check if title has parentheses with English e.g. "दृश्यम (Drishyam)"
    const parenMatch = /\(([^)]+)\)/.exec(title);
    if (parenMatch && /[a-zA-Z0-9]/.test(parenMatch[1])) {
      title = parenMatch[1].trim();
    }

    // Strip leading number dots, e.g. "1. Drishyam"
    title = title.replace(/^\d+\.\s*/, "").trim();

    // Check against ignore words
    if (ignoreWords.test(title)) return;

    // Resolve Hindi titles via dictionary if present
    for (const [hindi, english] of Object.entries(HINDI_TITLE_MAP)) {
      if (title.toLowerCase() === hindi || title.includes(hindi)) {
        title = english;
        break;
      }
    }

    const isAnime = KNOWN_ANIME_KEYWORDS.some((k) => title.toLowerCase().includes(k));
    if (!queries.has(title)) {
      queries.set(title, { year, isAnime });
    }
  };

  // 2. Style A Curated Showcase headings: "### 1. Title (Year)" or "### Title (Year)" or "### 1. Title"
  const styleARegex = /###\s*(?:\d+\.\s*)?([^\n(]+?)(?:\s*\(([0-9]{4})\))?(?:\n|$|\r)/g;
  let match: RegExpExecArray | null;
  while ((match = styleARegex.exec(text)) !== null) {
    const rawTitle = match[1]?.replace(/^[#\s]+|[\s#]+$/g, "").trim();
    const year = match[2];
    if (rawTitle) {
      addCandidate(rawTitle, year);
    }
  }

  // 3. Numbered or Bullet list with bold title: "1. **Title** (Year)" or "* **Title** (Year)" or "- **Title** (Year)"
  // Unicode \p{L} support for Hindi Devanagari & Latin titles
  const listBoldRegex = /(?:^|\n)\s*(?:\d+\.|\*|-)\s*\*\*([^*]+?)\*\*(?:\s*\(([0-9]{4})\))?/gu;
  while ((match = listBoldRegex.exec(text)) !== null) {
    const rawTitle = match[1]?.trim();
    const year = match[2];
    if (rawTitle) {
      addCandidate(rawTitle, year);
    }
  }

  // 4. Comparison Table rows: "| **Title** | ... |"
  const tableRegex = /\|\s*\*\*([^*]+?)\*\*\s*\|/gu;
  while ((match = tableRegex.exec(text)) !== null) {
    const rawTitle = match[1]?.trim();
    if (rawTitle) {
      addCandidate(rawTitle);
    }
  }

  // 5. Bold title with explicit year in body: "**Title** (Year)"
  const boldWithYearRegex = /\*\*([^*]+?)\*\*\s*\(([0-9]{4})\)/gu;
  while ((match = boldWithYearRegex.exec(text)) !== null) {
    const rawTitle = match[1]?.trim();
    const year = match[2];
    if (rawTitle) {
      addCandidate(rawTitle, year);
    }
  }

  return Array.from(queries.entries())
    .slice(0, 12)
    .map(([query, meta]) => ({ query, year: meta.year, isAnime: meta.isAnime }));
}
