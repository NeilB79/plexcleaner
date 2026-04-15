"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Film, LogOut, ShieldAlert, Flag, Bug, Tv } from "lucide-react";

import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

export default function Sidebar({ debugNotAdmin, setDebugNotAdmin, isCollapsed, setIsCollapsed }: { debugNotAdmin: boolean, setDebugNotAdmin: (val: boolean) => void, isCollapsed: boolean, setIsCollapsed: (val: boolean) => void }) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const effectivelyAdmin = session?.user?.isAdmin && !debugNotAdmin;

    const navItems = [
        { name: "Movies", href: "/", icon: Film },
        { name: "TV Shows", href: "/shows", icon: Tv },
        { name: "My Flags", href: "/flags", icon: Flag },
    ];

    if (effectivelyAdmin) {
        navItems.push({ name: "Manage Server", href: "/admin", icon: ShieldAlert });
    }

    return (
        <aside className={`${isCollapsed ? "w-[80px]" : "w-[280px]"} h-screen fixed top-0 left-0 flex flex-col bg-neutral-950/80 backdrop-blur-3xl border-r border-neutral-800/80 shadow-2xl z-50 transition-all duration-300`}>
            {/* Logo Area & Toggle */}
            <div className={`p-4 ${isCollapsed ? 'pt-6 items-center flex flex-col' : 'p-8 pb-6'} flex justify-between relative`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'} mb-4`}>
                    <div className="relative group cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
                        <img src="/logo.png" alt="Logo" className={`${isCollapsed ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl shadow-lg border border-neutral-700/50 transition-all`} />
                        {isCollapsed && (
                            <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Menu className="w-5 h-5 text-white" />
                            </div>
                        )}
                    </div>
                    {!isCollapsed && (
                        <div>
                            <h1 className="text-xl font-bold text-white leading-tight">Plex Cleaner</h1>
                            {effectivelyAdmin && (
                                <span className="inline-flex items-center gap-1 mt-1 bg-amber-500/10 text-amber-500 text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm border border-amber-500/20 font-bold">
                                    <ShieldAlert className="w-2.5 h-2.5" /> Admin
                                </span>
                            )}
                        </div>
                    )}
                </div>
                {!isCollapsed && (
                    <button 
                        onClick={() => setIsCollapsed(true)} 
                        className="absolute right-4 top-10 text-neutral-500 hover:text-white transition-colors"
                        title="Collapse Sidebar"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.name}
                            onClick={() => {
                                const currentParams = searchParams.toString();
                                const url = currentParams ? `${item.href}?${currentParams}` : item.href;
                                router.push(url);
                            }}
                            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'} rounded-xl transition-all duration-200 group ${isActive
                                    ? "bg-[#e5a00d] text-neutral-950 font-bold shadow-lg shadow-[#e5a00d]/20 scale-[0.98]"
                                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/50 font-semibold"
                                }`}
                            title={isCollapsed ? item.name : undefined}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? "text-neutral-950" : "text-neutral-500 group-hover:text-neutral-300"}`} />
                            {!isCollapsed && <span>{item.name}</span>}
                        </button>
                    );
                })}

                {/* Debug Button */}
                {session?.user?.isAdmin && (
                    <button
                        onClick={() => setDebugNotAdmin(!debugNotAdmin)}
                        className={`w-full mt-6 flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'} rounded-xl transition-all font-semibold ${debugNotAdmin
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                                : "text-neutral-500 hover:text-neutral-400 hover:bg-neutral-800/30"
                            }`}
                        title={isCollapsed ? (debugNotAdmin ? "Admin Off" : "Admin On") : "Debug: Pretend to be a regular user"}
                    >
                        <Bug className="w-5 h-5" />
                        {!isCollapsed && <span>{debugNotAdmin ? "Admin Off" : "Admin On"}</span>}
                    </button>
                )}
            </nav>

            {/* Profile / Bottom Area */}
            <div className={`p-4 mt-auto border-t border-neutral-800/50 bg-neutral-950/50 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-3 py-2 bg-neutral-800/50 border border-neutral-700/50'} rounded-xl`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        {session?.user?.image ? (
                            <img src={session.user.image} alt="Avatar" className="w-8 h-8 rounded-full border border-neutral-600 flex-shrink-0" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-neutral-700 border border-neutral-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {session?.user?.name?.[0]?.toUpperCase()}
                            </div>
                        )}
                        {!isCollapsed && <span className="text-sm font-semibold text-white truncate">{session?.user?.name}</span>}
                    </div>
                </div>

                <button
                    onClick={() => signOut()}
                    className={`w-full mt-3 flex items-center justify-center ${isCollapsed ? 'p-2' : 'gap-2 py-2.5'} text-sm font-bold text-red-400/80 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors border border-transparent hover:border-red-400/20`}
                    title={isCollapsed ? "Sign Out" : undefined}
                >
                    <LogOut className="w-4 h-4" /> 
                    {!isCollapsed && <span>Sign Out</span>}
                </button>
                
                {!isCollapsed && (
                    <div className="w-full text-center mt-4 text-[10px] text-neutral-600 font-medium tracking-widest">
                        v{APP_VERSION}
                    </div>
                )}
            </div>
        </aside>
    );
}
