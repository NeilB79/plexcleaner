"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Trash2, ShieldCheck, Clock, HardDrive, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [groupedRequests, setGroupedRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectingItemId, setRejectingItemId] = useState<string | null>(null);
    const [adminNote, setAdminNote] = useState("");

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signin");
        } else if (status === "authenticated" && !session?.user?.isAdmin) {
            router.push("/"); // Redirect non-admins back to home
        } else if (status === "authenticated" && session?.user?.isAdmin) {
            fetchRequests();
        }
    }, [status, session, router]);

    const fetchRequests = async () => {
        try {
            const res = await fetch("/api/admin/flags");
            if (res.ok) {
                const data = await res.json();
                setGroupedRequests(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (mediaItemId: string, action: "approve" | "keep") => {
        if (action === "keep" && rejectingItemId !== mediaItemId) {
            setRejectingItemId(mediaItemId);
            setAdminNote("");
            return;
        }

        setActionLoading(mediaItemId);
        try {
            const res = await fetch("/api/admin/flags", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mediaItemId, action, adminNote: action === "keep" ? adminNote : undefined }),
            });

            if (res.ok) {
                // Remove the item from the local state
                setGroupedRequests(current => current.filter(g => g.mediaItem.id !== mediaItemId));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(null);
            setRejectingItemId(null);
            setAdminNote("");
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

    // Calculate total space savings opportunity
    const totalBytes = groupedRequests.reduce((acc, curr) => {
        const size = curr.mediaItem.fileSize;
        return acc + (size ? (typeof size === 'string' ? parseInt(size, 10) : size) : 0);
    }, 0);
    const totalSavings = formatSize(totalBytes);

    return (
        <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-neutral-800">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2 text-white">
                        <ShieldAlert className="w-8 h-8 text-amber-500" />
                        Admin Dashboard
                    </h1>
                    <p className="text-neutral-400 mt-2">
                        Review media flagged for deletion by your family.
                    </p>
                </div>

                <div className="flex gap-4">
                    {groupedRequests.length > 0 && (
                        <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 flex items-center gap-3">
                            <div className="bg-amber-500/20 p-2 rounded-full">
                                <HardDrive className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-xs text-neutral-400 uppercase font-bold tracking-wider">Potential Savings</p>
                                <p className="text-xl font-bold text-white">{totalSavings}</p>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            <main>
                {groupedRequests.length === 0 ? (
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center flex flex-col items-center">
                        <ShieldCheck className="w-16 h-16 text-neutral-600 mb-4" />
                        <h2 className="text-xl font-bold text-white">All caught up!</h2>
                        <p className="text-neutral-400 mt-2 max-w-md">There are currently no active requests from your users to delete media from the server.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {groupedRequests.map((group) => {
                            const { mediaItem, requests } = group;
                            const isProcessing = actionLoading === mediaItem.id;

                            // We could add an API call here to check for conflicts (e.g. "Dad hasn't watched this"),
                            // but for this MVP, we show how many users actively flagged it vs didn't.
                            // A true conflict check requires polling the whole library which is very slow. 
                            const multiFlags = requests.length > 1;

                            return (
                                <div key={mediaItem.id} className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col md:flex-row gap-5 transition-opacity ${isProcessing ? 'opacity-50 pointer-events-none' : ''} relative`}>
                                    {/* Poster */}
                                    <div className="w-24 md:w-32 flex-shrink-0">
                                        {mediaItem.thumbUrl ? (
                                            <img src={mediaItem.thumbUrl} alt="poster" className="w-full h-auto rounded-lg shadow-md aspect-[2/3] object-cover" />
                                        ) : (
                                            <div className="w-full h-auto aspect-[2/3] bg-neutral-800 rounded-lg flex items-center justify-center text-xs text-center p-2 break-words">
                                                No Poster
                                            </div>
                                        )}
                                    </div>

                                    {/* Details and Actions Container */}
                                    <div className="flex-1 flex flex-col">

                                        {/* Top Header Row (Title on Left, Requesters on Right) */}
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                            <div>
                                                <h2 className="text-2xl font-bold text-white">
                                                    {mediaItem.type === 'season' ? `Season ${mediaItem.seasonNumber}` : mediaItem.title}
                                                </h2>
                                                <p className="text-neutral-400 capitalize flex items-center gap-2 mt-1 font-medium text-sm">
                                                    {mediaItem.type}
                                                    {mediaItem.fileSize && (
                                                        <>
                                                            <span className="text-neutral-600">•</span>
                                                            <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> {formatSize(mediaItem.fileSize)}</span>
                                                        </>
                                                    )}
                                                    {mediaItem.addedAt && (
                                                        <>
                                                            <span className="text-neutral-600">•</span>
                                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Added {formatDistanceToNow(new Date(mediaItem.addedAt), { addSuffix: true })}</span>
                                                        </>
                                                    )}
                                                </p>
                                            </div>

                                            {/* Requested By (Moved to Top Right) */}
                                            <div className="flex flex-col items-start md:items-end bg-neutral-950/30 p-2 md:p-3 rounded-xl border border-neutral-800/50 w-full md:w-60 flex-shrink-0">
                                                <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Requested By</h3>
                                                <div className="flex flex-wrap gap-1.5 justify-end">
                                                    {requests.map((req: any) => (
                                                        <div key={req.flagId} className="flex items-center gap-1.5 bg-neutral-800 px-2 py-1 rounded-md border border-neutral-700">
                                                            {req.user.avatarUrl ? (
                                                                <img src={req.user.avatarUrl} alt="avatar" className="w-4 h-4 rounded-full" />
                                                            ) : (
                                                                <div className="w-4 h-4 rounded-full bg-neutral-700 flex items-center justify-center text-[8px] uppercase font-bold text-neutral-300">
                                                                    {req.user.username[0]}
                                                                </div>
                                                            )}
                                                            <span className="text-xs font-semibold text-neutral-200">{req.user.username}</span>
                                                            <span className="text-[10px] text-neutral-500">({formatDistanceToNow(new Date(req.createdAt))} ago)</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {multiFlags && (
                                                    <div className="mt-2 text-[10px] text-amber-500 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 max-w-[220px] text-right">
                                                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                                        Multiple flags (consensus)
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Family Watch Status */}
                                        <div className="mt-4">
                                            {group.userWatchStatuses && group.userWatchStatuses.length > 0 && (
                                                <div className="bg-neutral-950/50 rounded-lg p-3 border border-neutral-800/50">
                                                    <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 border-b border-neutral-800 pb-1">Family Watch Status</h3>
                                                    <div className="flex flex-col gap-1.5 mt-2">
                                                        {group.userWatchStatuses.map((status: any, idx: number) => {
                                                            const isConflict = !status.isComplete;
                                                            return (
                                                                <div key={idx} className={`flex items-center justify-between p-1.5 px-3 rounded border ${isConflict ? "bg-red-500/10 border-red-500/20" : "bg-green-500/5 border-green-500/10"}`}>
                                                                    <div className="flex items-center gap-2">
                                                                        {status.avatarUrl ? (
                                                                            <img src={status.avatarUrl} alt="avatar" className="w-4 h-4 rounded-full" />
                                                                        ) : (
                                                                            <div className="w-4 h-4 rounded-full bg-neutral-700 flex items-center justify-center text-[8px] uppercase font-bold text-neutral-300">
                                                                                {status.username[0]}
                                                                            </div>
                                                                        )}
                                                                        <span className="text-xs font-medium text-neutral-300">{status.username}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className={`text-[10px] font-bold ${isConflict ? "text-red-400" : "text-green-500"}`}>
                                                                            {status.watchText}
                                                                        </span>
                                                                        {isConflict && (
                                                                            <div className="w-12 h-1 bg-neutral-800 rounded-full overflow-hidden">
                                                                                <div className="h-full bg-red-500" style={{ width: `${status.percent}%` }} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="mt-auto pt-5">
                                            {rejectingItemId === mediaItem.id ? (
                                                <div className="bg-neutral-800/80 p-4 rounded-xl border border-neutral-700 animate-in fade-in slide-in-from-bottom-2">
                                                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                                        <ShieldCheck className="w-4 h-4 text-amber-500" />
                                                        Keep Media
                                                    </h4>
                                                    <p className="text-xs text-neutral-400 mb-3">Provide an optional note to the requesting users explaining why this is being kept.</p>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Dad hasn't finished Season 3 yet"
                                                        value={adminNote}
                                                        onChange={(e) => setAdminNote(e.target.value)}
                                                        className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors mb-3"
                                                        autoFocus
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleAction(mediaItem.id, "keep")}
                                                            className="flex-1 bg-amber-500 hover:bg-amber-400 text-amber-950 py-2 rounded-lg text-sm font-bold transition-colors"
                                                        >
                                                            Confirm Keep
                                                        </button>
                                                        <button
                                                            onClick={() => { setRejectingItemId(null); setAdminNote(""); }}
                                                            className="px-4 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg text-sm font-bold transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => handleAction(mediaItem.id, "approve")}
                                                        className="flex-1 bg-green-500 hover:bg-green-400 text-green-950 py-2.5 px-4 rounded-xl flex flex-col items-center justify-center transition-colors shadow-sm relative group"
                                                    >
                                                        <div className="flex items-center gap-2 font-bold text-sm">
                                                            <Trash2 className="w-4 h-4" />
                                                            Acknowledge & Hide
                                                        </div>
                                                        <span className="text-[10px] font-medium opacity-75 mt-0.5">(I'll Delete Manually)</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(mediaItem.id, "keep")}
                                                        className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-2.5 px-4 rounded-xl flex flex-col items-center justify-center transition-colors border border-neutral-700 shadow-sm"
                                                    >
                                                        <div className="flex items-center gap-2 font-bold text-sm">
                                                            <ShieldCheck className="w-4 h-4 text-neutral-400" />
                                                            Keep Media
                                                        </div>
                                                        <span className="text-[10px] text-neutral-400 font-medium mt-0.5">(Reject Request)</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
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
