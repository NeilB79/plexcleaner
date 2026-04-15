"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, ArrowLeft, Clock, Trash2, ShieldCheck, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function MyFlagsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [flags, setFlags] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signin");
        } else if (status === "authenticated") {
            fetchFlags();
        }
    }, [status, router]);

    const fetchFlags = async () => {
        try {
            const res = await fetch("/api/flags");
            if (res.ok) {
                const data = await res.json();
                setFlags(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const formatSize = (bytes: string | number | null) => {
        if (!bytes) return "Unknown Size";
        const b = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
        if (isNaN(b) || b === 0) return "Unknown Size";
        const gb = b / (1024 * 1024 * 1024);
        if (gb < 1) return `${(b / (1024 * 1024)).toFixed(0)} MB`;
        return `${gb.toFixed(1)} GB`;
    };

    if (status === "loading" || loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-pulse w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-neutral-800">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2 text-white">
                        <Flag className="w-8 h-8 text-amber-500" />
                        My Flags
                    </h1>
                    <p className="text-neutral-400 mt-2">
                        Items you've selected for removal from the server.
                    </p>
                </div>
            </header>

            <main>
                {flags.length === 0 ? (
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center flex flex-col items-center">
                        <ShieldCheck className="w-16 h-16 text-neutral-600 mb-4" />
                        <h2 className="text-xl font-bold text-white">No flags yet!</h2>
                        <p className="text-neutral-400 mt-2 max-w-md">You haven't requested any items to be removed from the server.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {flags.map((flag) => {
                            const { mediaItem } = flag;

                            return (
                                <div key={flag.id} className="bg-neutral-900/50 hover:bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex gap-4 transition-colors">
                                    {/* Poster */}
                                    <div className="w-16 md:w-20 flex-shrink-0">
                                        {mediaItem.thumbUrl ? (
                                            <img src={mediaItem.thumbUrl} alt="poster" className="w-full h-auto rounded-lg shadow-md aspect-[2/3] object-cover" />
                                        ) : (
                                            <div className="w-full h-auto aspect-[2/3] bg-neutral-800 rounded-lg flex items-center justify-center text-[10px] text-center p-1 break-words">
                                                No Poster
                                            </div>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 flex flex-col justify-center">
                                        <h3 className="text-lg font-bold text-white">
                                            {mediaItem.type === 'season' ? `Season ${mediaItem.seasonNumber}` : mediaItem.title}
                                        </h3>
                                        <div className="text-neutral-400 capitalize flex flex-wrap items-center gap-2 mt-1 font-medium text-xs">
                                            <span>{mediaItem.type}</span>
                                            {mediaItem.fileSize && (
                                                <>
                                                    <span className="text-neutral-600">•</span>
                                                    <span>{formatSize(mediaItem.fileSize)}</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="mt-2 text-xs text-neutral-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Flagged {formatDistanceToNow(new Date(flag.createdAt), { addSuffix: true })}
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end justify-center pr-4 gap-2">
                                        {flag.status === "pending" ? (
                                            <div className="px-3 py-1 rounded bg-amber-500/10 text-amber-500 text-xs font-medium border border-amber-500/20 whitespace-nowrap">
                                                Pending Review
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-end gap-1.5">
                                                <div className="px-3 py-1 rounded bg-neutral-800 text-neutral-400 text-xs font-medium border border-neutral-700 flex items-center gap-1.5 whitespace-nowrap">
                                                    <ShieldCheck className="w-3 h-3" /> Kept by Admin
                                                </div>
                                                {flag.adminNote && (
                                                    <div className="text-[10px] text-neutral-500 flex items-start gap-1 max-w-[200px] text-right bg-neutral-950/50 p-1.5 rounded-lg border border-neutral-800/80">
                                                        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                                        <span className="italic leading-snug">"{flag.adminNote}"</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
