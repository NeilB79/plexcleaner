"use client";

import { useState, useRef } from "react";
import { Flag, CheckCircle, Undo2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MediaCardProps {
    ratingKey: string;
    title: string;
    showName?: string;
    type: "movie" | "show" | "season";
    thumbUrl: string;
    seasonNumber?: number;
    initialFlagStatus?: "pending" | "approved" | "kept" | null;
    viewedAt?: number;
    viewCount?: number;
    viewOffset?: number;
    leafCount?: number;
    viewedLeafCount?: number;
    onFlagUpdate?: (newStatus: string | null) => void;
    viewMode?: "grid" | "list";
}

export default function MediaCard({
    ratingKey,
    title,
    showName,
    type,
    thumbUrl,
    seasonNumber,
    initialFlagStatus,
    viewedAt,
    viewCount,
    viewOffset,
    leafCount,
    viewedLeafCount,
    onFlagUpdate,
    viewMode = "grid"
}: MediaCardProps) {
    const [status, setStatus] = useState(initialFlagStatus);
    const [loading, setLoading] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);

    const [showSeasons, setShowSeasons] = useState(false);
    const [seasons, setSeasons] = useState<any[]>([]);
    const [loadingSeasons, setLoadingSeasons] = useState(false);

    const holdTimer = useRef<NodeJS.Timeout | null>(null);
    const touchStartPos = useRef<{x: number, y: number} | null>(null);

    const startHold = (e: React.PointerEvent) => {
        if (confirmRemove) return; // Don't trigger if already active
        
        touchStartPos.current = { x: e.clientX, y: e.clientY };
        holdTimer.current = setTimeout(() => {
            if (navigator.vibrate) navigator.vibrate(50);
            setConfirmRemove(true);
        }, 800);
    };

    const cancelHold = () => {
        if (holdTimer.current) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!touchStartPos.current) return;
        const dx = Math.abs(e.clientX - touchStartPos.current.x);
        const dy = Math.abs(e.clientY - touchStartPos.current.y);
        // If the user scrolls or drags their finger more than 10px, cancel the hold
        if (dx > 10 || dy > 10) {
            cancelHold();
        }
    };

    const handlePosterClick = async () => {
        if (type !== "show") return;

        setShowSeasons(!showSeasons);
        if (!showSeasons && seasons.length === 0) {
            setLoadingSeasons(true);
            try {
                const res = await fetch(`/api/plex/seasons?ratingKey=${ratingKey}`);
                if (res.ok) {
                    const data = await res.json();
                    setSeasons(data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingSeasons(false);
            }
        }
    };

    const handleFlagAction = async (actionUrl: string, expectedStatus: string | null) => {
        setLoading(true);
        try {
            const res = await fetch(actionUrl, {
                method: actionUrl.includes("undo") ? "DELETE" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ratingKey, title, type, thumbUrl, seasonNumber }),
            });

            if (res.ok) {
                setStatus(expectedStatus as any);
                onFlagUpdate?.(expectedStatus);
            } else {
                console.error("Failed to update flag");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const isFlagged = status === "pending" || status === "approved";
    const label = type === "season" ? `${title} - Season ${seasonNumber}` : title;

    const isShow = type === "show" || type === "season";
    const isMovie = type === "movie";

    let hasRing = false;
    let isWatched = false;
    let isInProgress = false;
    let isUnwatched = false;
    let progressTooltip = "";

    if (isShow && typeof leafCount === "number" && typeof viewedLeafCount === "number" && leafCount > 0) {
        hasRing = true;
        isWatched = viewedLeafCount === leafCount;
        isUnwatched = viewedLeafCount === 0;
        isInProgress = viewedLeafCount > 0 && viewedLeafCount < leafCount;
        progressTooltip = `${viewedLeafCount} / ${leafCount} watched`;
    } else if (isMovie) {
        hasRing = true;
        isWatched = (viewCount ?? 0) > 0;
        isInProgress = (viewCount ?? 0) === 0 && (viewOffset ?? 0) > 0;
        isUnwatched = (viewCount ?? 0) === 0 && (viewOffset ?? 0) === 0;
        progressTooltip = isWatched ? "Watched" : isInProgress ? "In Progress" : "Unwatched";
    }
    
    // Custom button rendering to keep things DRY between Grid and List views
    const renderActionButtons = (size: "sm" | "md" = "sm") => {
        const py = size === "sm" ? "py-1.5 md:py-2" : "py-2 md:py-3";
        const textSz = size === "sm" ? "text-[10px] md:text-sm" : "text-xs md:text-base";
        const iconSz = size === "sm" ? "w-3 h-3 md:w-4 md:h-4" : "w-4 h-4 md:w-5 md:h-5";

        if (loading) {
            return (
                <button disabled className={`w-full ${py} bg-neutral-700/50 rounded-lg flex items-center justify-center`}>
                    <Loader2 className={`${iconSz} animate-spin text-neutral-400`} />
                </button>
            );
        }

        if (status === "pending") {
            return (
                <button
                    onClick={(e) => { e.stopPropagation(); setConfirmRemove(false); handleFlagAction(`/api/flags/undo`, null); }}
                    className={`w-full ${py} bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/50 rounded-lg flex items-center justify-center space-x-2 ${textSz} font-medium transition-colors`}
                    title="Undo Request"
                >
                    <Undo2 className={iconSz} />
                    <span>Undo</span>
                </button>
            );
        }

        if (status === "approved") {
            return (
                <div className={`w-full ${py} bg-green-500/20 text-green-300 border border-green-500/50 rounded-lg flex items-center justify-center space-x-2 ${textSz} font-medium`}>
                    <CheckCircle className={iconSz} />
                    <span>Removed</span>
                </div>
            );
        }

        if (status === "kept") {
            return (
                <div className={`w-full ${py} bg-neutral-800 text-neutral-400 border border-neutral-700 rounded-lg flex items-center justify-center space-x-2 ${textSz} font-medium`}>
                    <span>Kept</span>
                </div>
            );
        }

        if (confirmRemove) {
            return (
                <div className="grid grid-cols-2 gap-1.5 md:gap-2 w-full opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleFlagAction(`/api/flags`, "pending"); }}
                        className={`${py} bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center justify-center ${textSz} font-extrabold transition-all active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse hover:animate-none`}
                    >
                        Confirm
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setConfirmRemove(false); }}
                        className={`${py} bg-neutral-700/80 hover:bg-neutral-600 backdrop-blur-md text-white border border-white/10 rounded-lg flex items-center justify-center ${textSz} font-bold transition-all active:scale-95`}
                    >
                        Cancel
                    </button>
                </div>
            );
        }

        return (
            <button
                onClick={(e) => { e.stopPropagation(); setConfirmRemove(true); }}
                className={`w-full ${py} bg-white/10 hover:bg-amber-500 text-white hover:text-amber-950 backdrop-blur-md border border-white/20 hover:border-amber-500 rounded-lg flex items-center justify-center ${textSz} font-bold transition-all duration-300 shadow-sm opacity-100 md:opacity-0 md:translate-y-4 group-hover/card:opacity-100 group-hover/card:translate-y-0 active:scale-95`}
            >
                <span>Flag To Remove</span>
            </button>
        );
    };

    if (viewMode === "list") {
        return (
            <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`group/card relative flex flex-col bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 rounded-2xl transition-colors shadow-sm w-full select-none ${isFlagged ? "opacity-70 grayscale" : ""} ${showSeasons ? "z-50" : "z-10"}`}
                style={{ zIndex: showSeasons ? 50 : 1 }}
            >
                {/* Main Row */}
                <motion.div
                    onPointerDown={startHold}
                    onPointerMove={handlePointerMove}
                    onPointerUp={cancelHold}
                    onPointerLeave={cancelHold}
                    onPointerCancel={cancelHold}
                    whileTap={{ scale: 0.98 }}
                    onTap={() => {
                        cancelHold();
                        if (type === "show" && !confirmRemove) handlePosterClick();
                    }}
                    className="flex items-center gap-4 p-3 pr-6 cursor-pointer w-full"
                >
                    {/* Poster */}
                    <div className="w-16 h-24 md:w-20 md:h-32 flex-shrink-0 bg-neutral-800 rounded-lg overflow-hidden relative border border-neutral-700/50 shadow-md">
                        {thumbUrl ? (
                             <img src={thumbUrl} alt={label} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                            <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-500 p-2 text-center" />
                        )}
                    </div>

                {/* Details */}
                <div className="flex-1 min-w-0 py-1 flex flex-col justify-center">
                    {type === "season" && showName && (
                        <p className="text-amber-500 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1 truncate">{showName}</p>
                    )}
                    <h3 className="text-white font-bold text-base md:text-xl truncate leading-tight focus:outline-none">{label}</h3>
                    <p className="text-neutral-400 text-xs md:text-sm mt-1 flex items-center gap-2">
                        {type === "season" ? "Season" : type === "show" ? "TV Show" : "Movie"}
                        {viewedAt && (
                            <>
                                <span>•</span>
                                <span>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(viewedAt * 1000))}</span>
                            </>
                        )}
                        {hasRing && (
                            <>
                                <span>•</span>
                                <span className={isWatched ? "text-green-400" : isInProgress ? "text-amber-400" : "text-neutral-500"}>
                                    {progressTooltip}
                                </span>
                            </>
                        )}
                    </p>

                    {/* Show quick stats for Shows */}
                    {isShow && typeof leafCount === "number" && (
                         <div className="mt-3 w-48 h-1.5 bg-neutral-800 rounded-full overflow-hidden flex">
                            <div className="h-full bg-amber-500" style={{ width: `${(viewedLeafCount! / leafCount!) * 100}%` }} />
                        </div>
                    )}
                </div>

                {/* Action Button - Placed directly in the row on larger screens, stacks on small */}
                <div className="hidden md:flex flex-col items-end justify-center w-64 flex-shrink-0 -mr-2">
                    {renderActionButtons("md")}
                </div>

                {/* Provide a visual hint for the long press mechanic on mobile */}
                <div className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/card:opacity-100">
                     <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Hold</span>
                </div>
                </motion.div>

                 {/* Seasons Overlay for List View - Now rendered inline to push content down (Accordion style) */}
                 <AnimatePresence>
                 {showSeasons && type === "show" && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="w-full bg-neutral-900/80 border-t border-neutral-800/50 z-20 px-4 pb-4 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                         <div className="flex justify-between items-center mb-4 mt-4">
                            <h4 className="text-white text-sm font-bold uppercase tracking-wider">Seasons</h4>
                            <button onClick={() => setShowSeasons(false)} className="text-neutral-400 hover:text-white p-1 rounded-full bg-neutral-800 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>
                        
                        {loadingSeasons ? (
                            <div className="py-8 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
                            </div>
                        ) : seasons.length === 0 ? (
                            <p className="text-neutral-500 text-sm text-center py-8">No season data.</p>
                        ) : (
                            <div className="flex gap-3 overflow-x-auto pb-4 pt-2 px-2 -mx-2 snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                {seasons.map((s, index) => {
                                    const sNum = parseInt(s.title.replace(/\D/g, '')) || 0;
                                    if (sNum === 0 && !s.title.toLowerCase().includes('special')) return null;

                                    const total = s.leafCount || 0;
                                    const watched = s.viewedLeafCount || 0;
                                    const sIsUnwatched = watched === 0;
                                    const sIsWatched = total > 0 && watched === total;
                                    const sIsInProgress = watched > 0 && watched < total;
                                    const displayNum = s.title.toLowerCase().includes('special') ? 'Sp' : sNum.toString();

                                    return (
                                        <div key={s.ratingKey || index} className="snap-start flex flex-col items-center flex-shrink-0" title={`${s.title}: ${watched}/${total} watched`}>
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-md border-2 transition-transform ${sIsUnwatched ? "border-neutral-600 bg-neutral-800 text-neutral-400" : sIsWatched ? "border-green-500 bg-green-500/20 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.3)]" : "border-amber-500 bg-amber-500/20 text-amber-500 relative overflow-hidden"}`}>
                                                {sIsInProgress && (
                                                    <div className="absolute bottom-0 left-0 right-0 bg-amber-500/40" style={{ height: `${(watched / total) * 100}%` }} />
                                                )}
                                                <span className="z-10 relative drop-shadow-md">{displayNum}</span>
                                            </div>
                                            <span className="text-[10px] text-neutral-500 mt-2 font-medium">{watched}/{total}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
                </AnimatePresence>
            </motion.div>
        );
    }

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onPointerDown={startHold}
            onPointerMove={handlePointerMove}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            onPointerCancel={cancelHold}
            whileTap={{ scale: 0.96 }}
            className={`group/card relative rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-300 w-[calc(33vw-1rem)] md:w-auto ${isFlagged ? "opacity-90 grayscale" : "hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"}`}
            style={{ touchAction: 'pan-y' }}
        >
            <div className="aspect-[2/3] bg-neutral-800 relative select-none">
                {/* We use a standard img tag because next/image requires domain whitelisting for external URLs */}
                {thumbUrl ? (
                    <img
                        src={thumbUrl}
                        alt={label}
                        className={`w-full h-full object-cover transition-opacity ${isFlagged ? "opacity-50 grayscale" : "opacity-100"}`}
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600 bg-neutral-900 font-bold p-4 text-center">
                        {label}
                    </div>
                )}

                {/* Interaction layer for Poster click - Disables the default touch behaviors to allow the long press to work */}
                {type === "show" && (
                    <motion.div 
                        onTap={(e) => { cancelHold(); if (!confirmRemove) handlePosterClick(); }} 
                        className="absolute inset-x-0 top-0 bottom-24 z-10 cursor-pointer pointer-events-auto" 
                        title="View Seasons" 
                    />
                )}

                {/* Seasons Overlay */}
                {showSeasons && type === "show" && (
                    <div className="absolute inset-0 bg-neutral-950/90 backdrop-blur-md z-40 flex flex-col p-4 animate-in fade-in duration-200">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-white text-[10px] md:text-xs font-bold uppercase tracking-wider">Seasons</h4>
                            <button onClick={(e) => { e.stopPropagation(); setShowSeasons(false); }} className="text-neutral-400 hover:text-white p-1 md:p-1.5 rounded-full bg-neutral-800/50 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {loadingSeasons ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
                                </div>
                            ) : seasons.length === 0 ? (
                                <p className="text-neutral-500 text-xs text-center mt-10">No season data.</p>
                            ) : (
                                <div className="grid grid-cols-4 gap-1.5 md:gap-2 place-items-center">
                                    {seasons.map((s, index) => {
                                        const sNum = parseInt(s.title.replace(/\D/g, '')) || 0;
                                        if (sNum === 0 && !s.title.toLowerCase().includes('special')) return null;

                                        const total = s.leafCount || 0;
                                        const watched = s.viewedLeafCount || 0;
                                        const sIsUnwatched = watched === 0;
                                        const sIsWatched = total > 0 && watched === total;
                                        const sIsInProgress = watched > 0 && watched < total;
                                        const displayNum = s.title.toLowerCase().includes('special') ? 'Sp' : sNum.toString();

                                        return (
                                            <div key={s.ratingKey || index} className="flex flex-col items-center group/season" title={`${s.title}: ${watched}/${total} watched`}>
                                                <div className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold shadow-sm border-[1.5px] transition-transform cursor-help ${sIsUnwatched ? "border-neutral-600 bg-neutral-800/50 text-neutral-400" : sIsWatched ? "border-green-500 bg-green-500/20 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.3)]" : "border-amber-500 bg-amber-500/20 text-amber-500 relative overflow-hidden"}`}>
                                                    {sIsInProgress && (
                                                        <div className="absolute bottom-0 left-0 right-0 bg-amber-500/40" style={{ height: `${(watched / total) * 100}%` }} />
                                                    )}
                                                    <span className="z-10 relative drop-shadow-md">{displayNum}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Top edge text with slight background for Show Name */}
                {type === "season" && showName && (
                    <div className="absolute top-0 left-0 right-0 p-2 bg-neutral-950/50 backdrop-blur-sm border-b border-white/5 z-10">
                        <p className="text-neutral-200 text-[10px] font-bold uppercase tracking-widest text-center truncate shadow-sm">
                            {showName}
                        </p>
                    </div>
                )}

                {/* Progress Ring */}
                {hasRing && (
                    <div className="absolute top-2 right-2 flex items-center justify-center p-1 bg-neutral-950/70 backdrop-blur-md rounded-full border border-white/10 shadow-lg z-20" title={progressTooltip}>
                        {isUnwatched ? (
                            <div className="w-4 h-4 rounded-full border-2 border-neutral-500" />
                        ) : isWatched ? (
                            <div className="w-4 h-4 rounded-full bg-green-500 border border-green-600 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        ) : isInProgress ? (
                            <div className="w-4 h-4 rounded-full border-2 border-amber-500 relative overflow-hidden">
                                <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-amber-500" />
                            </div>
                        ) : null}
                    </div>
                )}

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 bg-neutral-950/70 backdrop-blur-md border-t border-white/10">
                    <h3 className="text-white font-bold leading-tight truncate text-sm md:text-base drop-shadow-md">
                        {label}
                    </h3>
                    <p className="text-neutral-300 text-[10px] md:text-xs mt-1 drop-shadow-md capitalize flex items-center gap-2">
                        <span>{type}</span>
                        {viewedAt && (
                            <>
                                <span className="opacity-50">•</span>
                                <span className="text-neutral-400">
                                    {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(viewedAt * 1000))}
                                </span>
                            </>
                        )}
                    </p>

                    <div className="mt-2 md:mt-3 pointer-events-auto">
                        {renderActionButtons("sm")}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
