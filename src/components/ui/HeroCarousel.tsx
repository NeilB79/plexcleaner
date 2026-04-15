"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function HeroCarousel({ items, onFlagAction }: { items: any[], onFlagAction: (ratingKey: string, actionUrl: string) => void }) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Get up to 5 fully-watched, old movies
    const featuredItems = items
        .filter(i => i.type === "movie" && i.viewCount > 0 && !i.flagStatus) // movies, watched, not already flagged
        .sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0)) // oldest first
        .slice(0, 5);

    if (featuredItems.length === 0) return null;

    const scroll = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = current.clientWidth * 0.8;
            current.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
        }
    };

    return (
        <div className="relative w-full mb-12 rounded-[2rem] overflow-hidden group">
            {/* Scroll Buttons (visible on hover/desktop) */}
            <button onClick={() => scroll("left")} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-neutral-950/40 hover:bg-neutral-950/80 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all shadow-xl md:block hidden">
                <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={() => scroll("right")} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-neutral-950/40 hover:bg-neutral-950/80 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all shadow-xl md:block hidden">
                <ChevronRight className="w-6 h-6" />
            </button>

            {/* Carousel Track */}
            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {featuredItems.map((item) => (
                    <div key={item.ratingKey} className="w-full flex-shrink-0 snap-center relative aspect-[16/9] md:aspect-[21/9] lg:aspect-[24/9]">
                        {/* Dynamic Blurred Background */}
                        <div className="absolute inset-0 w-full h-full overflow-hidden bg-neutral-950">
                            {item.thumbUrl ? (
                                <img
                                    src={item.thumbUrl}
                                    alt="bg"
                                    className="w-full h-full object-cover opacity-40 scale-125 blur-3xl saturate-[1.5]"
                                />
                            ) : null}
                            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/40 to-transparent" />
                        </div>

                        {/* Foreground Content */}
                        <div className="absolute inset-0 flex items-center justify-start p-8 md:p-16 gap-8 z-10 w-full max-w-6xl mx-auto">
                            {/* Poster (Only on larger screens) */}
                            <div className="hidden md:block w-48 lg:w-64 flex-shrink-0 animate-in fade-in slide-in-from-left-8 duration-700">
                                {item.thumbUrl && (
                                    <img
                                        src={item.thumbUrl}
                                        alt={item.title}
                                        className="w-full aspect-[2/3] object-cover rounded-2xl shadow-2xl border border-white/10 ring-1 ring-black/50"
                                    />
                                )}
                            </div>

                            {/* Text & Primary Action Button */}
                            <div className="flex flex-col justify-end xl:justify-center h-full max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-white/90 uppercase tracking-widest mb-4 w-fit shadow-xl">
                                    <Trash2 className="w-3 h-3 text-amber-500" /> Suggested Removal
                                </div>
                                <h2 className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-white leading-tight drop-shadow-2xl">
                                    {item.title}
                                </h2>

                                <div className="flex flex-wrap items-center gap-4 mt-6 text-sm font-medium text-white/70">
                                    {item.addedAt && (
                                        <span className="bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm shadow-inner">
                                            Added {formatDistanceToNow(new Date(item.addedAt * 1000))} ago
                                        </span>
                                    )}
                                    {item.viewedAt && (
                                        <span className="bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm flex items-center gap-2 shadow-inner">
                                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                                            Watched
                                        </span>
                                    )}
                                </div>

                                <div className="mt-8">
                                    <button
                                        onClick={() => onFlagAction(item.ratingKey, "/api/flags")}
                                        className="bg-white hover:bg-neutral-200 text-neutral-950 px-8 py-4 rounded-2xl font-bold text-lg transition-transform active:scale-95 shadow-xl flex items-center gap-3 w-fit"
                                    >
                                        <Trash2 className="w-6 h-6" /> Flag to Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* Carousel Indicators */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
                {featuredItems.map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-white/50 border border-black/20" />
                ))}
            </div>
        </div>
    );
}
