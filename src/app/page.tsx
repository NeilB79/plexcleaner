"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LogOut, Film, Tv, ShieldAlert, Search, Bug, ArrowUp, ArrowDown, Flag, X, LayoutGrid, List, Trash2, ChevronDown, ListFilter, SortDesc } from "lucide-react";
import MediaCard from "@/components/ui/MediaCard";
import { APP_VERSION } from "@/lib/version";
import { useAppStore } from "@/store/appStore";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const setDynamicBackgroundUrl = useAppStore((state) => state.setDynamicBackgroundUrl);

  // Initialize state from URL params if present
  const initialWatchFilter = (searchParams.get("watch") as any) || "all";
  const initialSearchQuery = searchParams.get("q") || "";
  const initialSortBy = (searchParams.get("sort") as any) || "added";
  const initialSortOrder = (searchParams.get("order") as any) || "desc";
  const initialView = (searchParams.get("view") as any) || "grid";

  const [watchFilter, setWatchFilter] = useState<"all" | "watched" | "unwatched" | "in_progress">(initialWatchFilter);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [sortBy, setSortBy] = useState<"added" | "watched" | "a-z">(initialSortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialSortOrder);
  const [displayView, setDisplayView] = useState<"grid" | "list">(initialView);
  const [displayLimit, setDisplayLimit] = useState(50);

  // Sync state to URL whenever filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (watchFilter !== "all") params.set("watch", watchFilter);
    else params.delete("watch");
    
    if (searchQuery) params.set("q", searchQuery);
    else params.delete("q");
    
    if (sortBy !== "added") params.set("sort", sortBy);
    else params.delete("sort");
    
    if (sortOrder !== "desc") params.set("order", sortOrder);
    else params.delete("order");

    if (displayView !== "grid") params.set("view", displayView);
    else params.delete("view");

    const newUrl = `${pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [watchFilter, searchQuery, sortBy, sortOrder, displayView, pathname, router, searchParams]);

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayLimit(50);
  }, [watchFilter, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchDashboard();
    }
  }, [status, router]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((i) => {
    const isMovie = i.type === "movie";
    const searchString = (i.title || i.parentTitle || "").toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());

    let matchesWatchFilter = true;
    if (watchFilter !== "all") {
      const isShow = i.type === "show" || i.type === "season";
      const isFullyWatched = isShow
        ? (i.viewedLeafCount === i.leafCount && i.leafCount > 0)
        : (i.viewCount > 0);
      const isUnwatched = isShow
        ? (i.viewedLeafCount === 0 || !i.viewedLeafCount)
        : (!i.viewCount || i.viewCount === 0);
      const isInProgress = isShow
        ? (i.viewedLeafCount > 0 && i.viewedLeafCount < i.leafCount)
        : false; // Movies typically don't show as "in progress" distinctly in this view, so we group them into Unwatched if not fully watched

      if (watchFilter === "watched") matchesWatchFilter = isFullyWatched;
      if (watchFilter === "unwatched") matchesWatchFilter = isUnwatched;
      if (watchFilter === "in_progress") matchesWatchFilter = isInProgress;
    }

    return isMovie && matchesSearch && matchesWatchFilter;
  }).sort((a, b) => {
    let result = 0;
    if (sortBy === "watched") {
      const aTime = a.viewedAt || 0;
      const bTime = b.viewedAt || 0;
      result = bTime - aTime;
    } else if (sortBy === "a-z") {
      const aTitle = (a.parentTitle || a.title || "").toLowerCase();
      const bTitle = (b.parentTitle || b.title || "").toLowerCase();
      result = aTitle.localeCompare(bTitle);
    } else {
      const aTime = a.addedAt || 0;
      const bTime = b.addedAt || 0;
      result = bTime - aTime;
    }
    return sortOrder === "asc" ? -result : result;
  });

  // Update dynamic background when top item changes
  useEffect(() => {
    if (loading) return;
    if (filteredItems.length > 0) {
      setDynamicBackgroundUrl(filteredItems[0].thumbUrl);
    } else if (items.length > 0) {
      setDynamicBackgroundUrl(items[0].thumbUrl);
    }
  }, [items, filteredItems, setDynamicBackgroundUrl, loading]);

  // Clean up
  useEffect(() => {
    return () => setDynamicBackgroundUrl(null);
  }, [setDynamicBackgroundUrl]);

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
          <p className="text-neutral-400 font-medium">Loading your Plex history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 xl:p-12 space-y-10">
      {/* Main Content */}
      <main className="space-y-8">
        {/* Controls */}
        <div className="flex flex-col gap-4 bg-neutral-900/50 p-4 md:p-6 rounded-2xl border border-neutral-800/80 shadow-sm z-20 relative">
          
          {/* Top Row: Permanent Filter Grid */}
          <div className="flex flex-row gap-3 w-full">
              {/* Status Dropdown */}
              <div className="relative flex-1">
                 <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                    <ListFilter className="w-4 h-4 md:w-5 md:h-5" />
                 </div>
                 <select 
                    value={watchFilter} 
                    onChange={(e) => setWatchFilter(e.target.value as any)}
                    className="w-full appearance-none bg-neutral-950 border border-neutral-800 text-white text-[10px] md:text-sm font-semibold py-2.5 md:py-3 pl-9 md:pl-10 pr-8 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500/50 cursor-pointer shadow-inner block"
                 >
                    <option value="all">All Status</option>
                    <option value="watched">Watched</option>
                    <option value="in_progress">In Progress</option>
                    <option value="unwatched">Unwatched</option>
                 </select>
                 <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-neutral-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Sort Dropdown */}
              <div className="relative flex-1">
                 <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                    <SortDesc className="w-4 h-4 md:w-5 md:h-5" />
                 </div>
                 <select 
                    value={`${sortBy}|${sortOrder}`} 
                    onChange={(e) => {
                        const [sBy, sOrd] = e.target.value.split('|');
                        setSortBy(sBy as any);
                        setSortOrder(sOrd as any);
                    }}
                    className="w-full appearance-none bg-neutral-950 border border-neutral-800 text-white text-[10px] md:text-sm font-semibold py-2.5 md:py-3 pl-9 md:pl-10 pr-8 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500/50 cursor-pointer shadow-inner block"
                 >
                    <option value="added|desc">Added (New)</option>
                    <option value="added|asc">Added (Old)</option>
                    <option value="watched|desc">Watched (Recent)</option>
                    <option value="watched|asc">Watched (Old)</option>
                    <option value="a-z|asc">Name (A-Z)</option>
                    <option value="a-z|desc">Name (Z-A)</option>
                 </select>
                 <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-neutral-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* View Toggle */}
              <div className="flex bg-neutral-950 p-1 md:p-1.5 rounded-xl border border-neutral-800 shadow-inner shrink-0">
                  <button
                    onClick={() => setDisplayView("grid")}
                    className={`flex items-center justify-center w-8 md:w-10 rounded-lg transition-all ${displayView === "grid" ? "bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700" : "text-neutral-500 hover:text-neutral-300"}`}
                  >
                    <LayoutGrid className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  <button
                    onClick={() => setDisplayView("list")}
                    className={`flex items-center justify-center w-8 md:w-10 rounded-lg transition-all ${displayView === "list" ? "bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700" : "text-neutral-500 hover:text-neutral-300"}`}
                  >
                    <List className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
              </div>
          </div>

          {/* Bottom Row: Search */}
          <div className="relative w-full">
              <input
                type="text"
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-10 pr-10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e5a00d]/50 transition-all font-medium text-sm shadow-inner"
              />
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors bg-neutral-800 hover:bg-neutral-700 rounded-full p-1 shadow-sm active:scale-90"
                  title="Clear Search"
                >
                  <X className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              )}
          </div>
        </div>

        {/* Dynamic Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              Movies
              <span className="text-neutral-500 font-normal text-lg">({filteredItems.length})</span>
            </h2>
          </div>

          {filteredItems.length === 0 ? (
            <p className="text-neutral-500 italic bg-neutral-900/50 p-8 rounded-xl border border-neutral-800 text-center">
              {searchQuery ? "No results match your search." : `No movies found in your recent history.`}
            </p>
          ) : (
            <>
              <div className={displayView === "grid" ? "grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6" : "flex flex-col gap-4 lg:gap-6 w-full items-stretch"}>
                {filteredItems.slice(0, displayLimit).map((item) => (
                  <MediaCard
                    key={item.ratingKey}
                    viewMode={displayView}
                    ratingKey={item.ratingKey}
                    title={item.type === 'season' ? item.title : (item.parentTitle || item.title)}
                    showName={item.parentTitle || item.grandparentTitle}
                    type={item.type}
                    thumbUrl={item.thumbUrl}
                    initialFlagStatus={item.flagStatus}
                    viewedAt={item.viewedAt}
                    viewCount={item.viewCount}
                    viewOffset={item.viewOffset}
                    leafCount={item.leafCount}
                    viewedLeafCount={item.viewedLeafCount}
                    seasonNumber={item.type === 'season' ? parseInt(item.title.replace(/\D/g, '')) || undefined : undefined}
                  />
                ))}
              </div>
              
              {displayLimit < filteredItems.length && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={() => setDisplayLimit(prev => prev + 50)}
                    className="px-8 py-3 bg-neutral-800 hover:bg-neutral-700 hover:border-amber-500/50 text-white rounded-xl font-bold transition-all border border-neutral-700 shadow-md flex items-center gap-2 group"
                  >
                    Load More
                    <ArrowDown className="w-4 h-4 text-neutral-400 group-hover:text-amber-500 transition-colors" />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
