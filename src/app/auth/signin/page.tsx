"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import axios from "axios";
import { APP_VERSION } from "@/lib/version";

// This runs entirely on the client side
export default function SignIn() {
    const [loading, setLoading] = useState(false);
    const [plexPin, setPlexPin] = useState<{ id: string; code: string } | null>(null);
    const [error, setError] = useState("");

    const appName = "Plex Cleanup App";
    const clientIdentifier = "plex-cleanup-app-local"; // Should ideally be unique

    const initiatePlexAuth = async () => {
        setLoading(true);
        setError("");
        try {
            // 1. Request a new PIN from Plex
            const pinRes = await axios.post("https://plex.tv/api/v2/pins?strong=true", null, {
                headers: {
                    Accept: "application/json",
                    "X-Plex-Client-Identifier": clientIdentifier,
                    "X-Plex-Product": appName,
                    "X-Plex-Version": "1.0",
                    "X-Plex-Device": "Web",
                    "X-Plex-Device-Name": "Web Browser",
                    "X-Plex-Platform": "Web",
                }
            });

            const pin = { id: pinRes.data.id, code: pinRes.data.code };
            setPlexPin(pin);

            // 2. Open Plex Auth Window
            const params = new URLSearchParams({
                clientID: clientIdentifier,
                "context[device][product]": appName,
                "context[device][version]": "1.0",
                "context[device][device]": "Web",
                "context[device][deviceName]": "Web Browser",
                "context[device][os]": "Web",
                code: pin.code,
                forwardUrl: window.location.href,
            });
            const authUrl = `https://app.plex.tv/auth/#!?${params.toString()}`;
            const authWindow = window.open(authUrl, "_blank", "width=600,height=700");

            // 3. Poll for the token (the server also checks, but the client needs to know when to submit)
            let pollInterval = setInterval(async () => {
                try {
                    const checkRes = await axios.get(`https://plex.tv/api/v2/pins/${pin.id}`, {
                        headers: {
                            Accept: "application/json",
                            "X-Plex-Client-Identifier": clientIdentifier,
                        }
                    });

                    if (checkRes.data.authToken) {
                        clearInterval(pollInterval);
                        authWindow?.close();
                        // Now sign in through NextAuth using the verified pin ID
                        await signIn("credentials", {
                            pinId: pin.id,
                            callbackUrl: "/",
                        });
                    }
                } catch (e) {
                    // Keep polling unless auth fails
                }
            }, 2000);

            // Timeout after 3 minutes
            setTimeout(() => {
                clearInterval(pollInterval);
                if (!authWindow?.closed) {
                    setError("Authentication timed out. Please try again.");
                    setLoading(false);
                }
            }, 180000);

        } catch (err) {
            console.error(err);
            setError("Failed to communicate with Plex.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">
            <div className="max-w-md w-full p-8 bg-neutral-800 rounded-xl shadow-2xl space-y-8 text-center border border-neutral-700">
                <div className="space-y-4">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                        Plex Cleanup
                    </h1>
                    <p className="text-neutral-400">
                        Log in with your Plex account to choose which movies and shows you're done with.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <button
                    onClick={initiatePlexAuth}
                    disabled={loading || !!plexPin}
                    className="w-full py-3 px-4 bg-[#e5a00d] hover:bg-[#c98e0b] text-neutral-950 font-bold rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                    {loading && !plexPin ? (
                        <span className="animate-pulse">Waiting for Plex...</span>
                    ) : (
                        <span>{plexPin ? "Popup Opened" : "Sign In with Plex"}</span>
                    )}
                </button>

                {plexPin && (
                    <div className="pt-4 border-t border-neutral-700 animate-in fade-in slide-in-from-bottom-4">
                        <p className="text-sm text-neutral-400 mb-4">
                            If the popup didn't open, or if you've already signed in and this page hasn't refreshed:
                        </p>
                        <button
                            onClick={async () => {
                                setLoading(true);
                                try {
                                    const checkRes = await axios.get(`https://plex.tv/api/v2/pins/${plexPin.id}`, {
                                        headers: {
                                            Accept: "application/json",
                                            "X-Plex-Client-Identifier": clientIdentifier,
                                        }
                                    });
                                    if (checkRes.data.authToken) {
                                        await signIn("credentials", {
                                            pinId: plexPin.id,
                                            callbackUrl: "/",
                                        });
                                    } else {
                                        setError("Plex hasn't confirmed your login yet. Try again or complete the popup.");
                                    }
                                } catch (e) {
                                    setError("Error checking status.");
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            className="w-full py-3 px-4 bg-neutral-700 hover:bg-neutral-600 text-white font-bold rounded-lg transition-all"
                        >
                            I have logged in
                        </button>
                    </div>
                )}

                {loading && !plexPin && (
                    <p className="text-xs text-neutral-500 animate-pulse">
                        A login window should pop up. If not, check your browser's blocker settings.
                    </p>
                )}

                <p className="text-[10px] text-neutral-600 font-mono pt-4 border-t border-neutral-700/50 mt-4">
                    {APP_VERSION}
                </p>
            </div>
        </div>
    );
}
