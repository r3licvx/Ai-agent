import React, { useRef, useState, useEffect } from "react";
import {
  Star,
  Film,
  Tv,
  ExternalLink,
  Clapperboard,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { TMDBMediaItem } from "@/lib/tmdb";

export interface TMDBMediaCardsProps {
  items: TMDBMediaItem[];
}

export function TMDBMediaCards({ items }: TMDBMediaCardsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [items]);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const offset = direction === "left" ? -280 : 280;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    // Allow natural vertical mouse wheel to scroll horizontal strip smoothly
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && Math.abs(e.deltaY) > 5) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="relative my-3.5 w-full group/strip">
      {/* Left Scroll Button (Desktop hover only so it never blocks posters on mobile touch devices) */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll("left")}
          className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 size-8 rounded-full bg-background/90 hover:bg-background border border-border shadow-md items-center justify-center text-foreground hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-xs"
          title="Scroll Left"
          aria-label="Scroll Left"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}

      {/* Right Scroll Button (Desktop hover only) */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll("right")}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 size-8 rounded-full bg-background/90 hover:bg-background border border-border shadow-md items-center justify-center text-foreground hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-xs"
          title="Scroll Right"
          aria-label="Scroll Right"
        >
          <ChevronRight className="size-4" />
        </button>
      )}

      {/* Clean horizontal scroll strip with full screen width bleed on mobile and natural touch & wheel scroll */}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex gap-3 overflow-x-auto pb-2 no-scrollbar scroll-smooth overscroll-x-contain -mx-3.5 px-3.5 sm:mx-0 sm:px-0"
      >
        {items.map((movie) => {
          const tmdbUrl = `https://www.themoviedb.org/${movie.mediaType}/${movie.id}`;

          return (
            <div
              key={`${movie.mediaType}-${movie.id}`}
              className="shrink-0 w-[150px] sm:w-[165px] rounded-2xl overflow-hidden bg-card border border-border/70 shadow-xs hover:shadow-md hover:border-primary/50 transition-all duration-200 group/card flex flex-col justify-between select-none"
            >
              {/* Poster and Title Link (Navigates to TMDB) */}
              <a
                href={tmdbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block no-underline flex-1 flex flex-col justify-between"
                title={`View ${movie.title} on TMDB`}
              >
                {/* Poster container with fixed 2:3 aspect ratio preventing layout shifts */}
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

                {/* Title & Metadata */}
                <div className="p-2.5 pb-1.5">
                  <h5 className="font-bold text-[13px] sm:text-[13.5px] text-foreground line-clamp-2 leading-snug group-hover/card:text-primary transition-colors">
                    {movie.title}
                  </h5>
                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                    {movie.year || "Release info"}
                    {movie.originalLanguage ? ` • ${movie.originalLanguage}` : ""}
                  </p>
                </div>
              </a>

              {/* Bottom Action Bar: TMDB & Official Trailer Links (Never nested in an anchor tag) */}
              <div className="px-2.5 pb-2.5 pt-1.5 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                <a
                  href={tmdbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold hover:text-primary transition-colors no-underline group/link"
                  title={`View ${movie.title} on TMDB`}
                >
                  <span>TMDB</span>
                  <ExternalLink className="size-3 shrink-0 opacity-70 group-hover/link:opacity-100" />
                </a>

                {movie.trailerUrl && (
                  <a
                    href={movie.trailerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white font-bold text-[10px] transition-all cursor-pointer no-underline"
                    title={`Watch official trailer for ${movie.title} on YouTube`}
                  >
                    <Play className="size-2.5 fill-current" />
                    <span>Trailer</span>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Keep backwards-compatible export name if referenced elsewhere
export const TMDBMovieCarousel = TMDBMediaCards;
