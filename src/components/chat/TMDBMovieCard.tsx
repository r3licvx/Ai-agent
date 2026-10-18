import React from "react";
import { Star, Film, Tv, ExternalLink, Clapperboard, Play } from "lucide-react";
import type { TMDBMediaItem } from "@/lib/tmdb";

export interface TMDBMediaCardsProps {
  items: TMDBMediaItem[];
}

export function TMDBMediaCards({ items }: TMDBMediaCardsProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="my-3.5 w-full">
      {/* Clean horizontal scroll strip with natural touch scroll, no buttons, zero empty margins */}
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
        {items.map((movie) => {
          const tmdbUrl = `https://www.themoviedb.org/${movie.mediaType}/${movie.id}`;

          return (
            <a
              key={`${movie.mediaType}-${movie.id}`}
              href={tmdbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 w-[140px] sm:w-[155px] rounded-2xl overflow-hidden bg-card border border-border/70 shadow-xs hover:shadow-md hover:border-primary/50 transition-all duration-200 group/card flex flex-col justify-between no-underline"
              title={`View ${movie.title} on TMDB`}
            >
              {/* Poster container */}
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted/40">
                {movie.posterPath ? (
                  <img
                    src={movie.posterPath}
                    alt={movie.title}
                    className="size-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="size-full flex flex-col items-center justify-center p-3 text-center bg-slate-900 text-white">
                    <Film className="size-7 text-white/40 mb-1" />
                    <span className="text-[11px] font-bold line-clamp-2">{movie.title}</span>
                  </div>
                )}

                {/* Rating Badge */}
                {movie.voteAverage > 0 && (
                  <div className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-white text-[10.5px] font-bold shadow-xs">
                    <Star className="size-2.5 fill-amber-400 text-amber-400" />
                    <span>{movie.voteAverage}</span>
                  </div>
                )}

                {/* Accurate Type & Genre Badge */}
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                  {movie.isAnime ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-purple-600/90 backdrop-blur-md text-white text-[9.5px] font-extrabold uppercase tracking-wide shadow-2xs">
                      {movie.mediaType === "tv" ? "Anime Series" : "Anime Film"}
                    </span>
                  ) : movie.isAnimation ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-sky-600/90 backdrop-blur-md text-white text-[9.5px] font-bold shadow-2xs">
                      <Clapperboard className="size-2.5" />
                      <span>Animation</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-white text-[9.5px] font-semibold shadow-2xs">
                      {movie.mediaType === "tv" ? (
                        <>
                          <Tv className="size-2.5 text-emerald-400" />
                          <span>Web Series</span>
                        </>
                      ) : (
                        <>
                          <Film className="size-2.5 text-blue-400" />
                          <span>Movie</span>
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Title & TMDB Link Bar */}
              <div className="p-2.5 flex flex-col justify-between flex-1">
                <div>
                  <h5 className="font-bold text-[13px] sm:text-[13.5px] text-foreground line-clamp-2 leading-snug group-hover/card:text-primary transition-colors">
                    {movie.title}
                  </h5>
                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                    {movie.year || "Release info"}
                    {movie.originalLanguage ? ` • ${movie.originalLanguage}` : ""}
                  </p>
                </div>

                <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground group-hover/card:text-primary transition-colors">
                  <span className="font-semibold">TMDB</span>
                  {movie.trailerUrl ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(movie.trailerUrl!, "_blank", "noopener,noreferrer");
                      }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white font-bold text-[10px] transition-all cursor-pointer"
                      title={`Watch official trailer for ${movie.title} on YouTube`}
                    >
                      <Play className="size-2.5 fill-current" />
                      <span>Trailer</span>
                    </button>
                  ) : (
                    <ExternalLink className="size-3 shrink-0 opacity-70 group-hover/card:opacity-100" />
                  )}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// Keep backwards-compatible export name if referenced elsewhere
export const TMDBMovieCarousel = TMDBMediaCards;
