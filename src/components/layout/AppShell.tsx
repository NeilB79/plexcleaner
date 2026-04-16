"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { useAppStore } from "@/store/appStore";

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(true); // default to collapsed for space
    const [showScrollTop, setShowScrollTop] = useState(false);
    const dynamicBackgroundUrl = useAppStore((state) => state.dynamicBackgroundUrl);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // Don't show shell on auth pages
    if (pathname.startsWith('/auth')) {
        return <>{children}</>;
    }

    if (status === "loading") {
        return (
            <div className="flex h-screen items-center justify-center bg-neutral-950">
                <div className="animate-pulse w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    if (status === "unauthenticated") {
        return <>{children}</>; // Will be redirected by protected pages anyway
    }

    return (
        <div className="flex min-h-screen bg-black relative text-white">
            {/* Dynamic Glassmorphic Backdrop */}
            {dynamicBackgroundUrl && (
                <div 
                    className="fixed inset-0 z-0 pointer-events-none transition-all duration-1000 ease-in-out"
                    style={{
                        backgroundImage: `url(${dynamicBackgroundUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(80px) saturate(180%) brightness(0.6)',
                        transform: 'scale(1.2)' // Scale slightly to prevent blurred edges from showing container
                    }}
                >
                    {/* Add a black overlay to ensure text contrast is always decent */}
                    <div className="absolute inset-0 bg-neutral-950/40 mix-blend-multiply" />
                </div>
            )}

            {/* Fixed Sidebar for iPad / Desktop */}
            <div className={`hidden md:block flex-shrink-0 transition-all z-20 duration-300 ${isCollapsed ? 'w-[80px]' : 'w-[280px]'}`}>
                <Sidebar 
                    isCollapsed={isCollapsed} 
                    setIsCollapsed={setIsCollapsed} 
                />
            </div>

            {/* Mobile Header (Fallback context, though target is primarily iPad) */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800/50 z-50 flex items-center px-4">
                <span className="text-amber-500 font-bold">Plex Cleaner</span>
                {/* Mobile nav could go here, omitting for now to focus on iPad */}
            </div>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 pt-16 md:pt-0 relative z-10">
                {/* We pass debug context down if pages need it, but realistically it controls routing. */}
                {children}

                {/* Floating Jump to Top Button */}
                <button
                    onClick={scrollToTop}
                    className={`fixed bottom-8 right-8 z-50 p-4 rounded-full bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all duration-300 transform active:scale-90 ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
                    title="Jump to Top"
                >
                    <ArrowUp className="w-6 h-6" />
                </button>
            </main>
        </div>
    );
}
