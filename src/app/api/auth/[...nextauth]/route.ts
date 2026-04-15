import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import { parseStringPromise } from "xml2js";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            plexId: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            plexToken: string;
            isAdmin: boolean;
        }
    }
    interface User {
        id: string;
        plexId: string;
        plexToken: string;
        isAdmin: boolean;
    }
}

const PLEX_TV_URL = "https://plex.tv/api/v2";
const APP_NAME = "Plex Cleanup App";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Plex",
            credentials: {
                pinId: { label: "PIN ID", type: "text" },
                pinCode: { label: "PIN Code", type: "text" },
            },
            async authorize(credentials) {
                if (!credentials?.pinId) return null;

                try {
                    // Poll Plex to see if the PIN was authenticated
                    const response = await axios.get(`${PLEX_TV_URL}/pins/${credentials.pinId}`, {
                        headers: {
                            Accept: "application/json",
                            "X-Plex-Client-Identifier": "plex-cleanup-app-local",
                        },
                    });

                    const authToken = response.data.authToken;

                    if (!authToken) {
                        return null; // Not authenticated yet
                    }

                    // Fetch user details using the auth token
                    const userResponse = await axios.get(`${PLEX_TV_URL}/user`, {
                        headers: {
                            Accept: "application/json",
                            "X-Plex-Token": authToken,
                            "X-Plex-Client-Identifier": "plex-cleanup-app-local",
                        },
                    });

                    const plexUser = userResponse.data;
                    const plexId = plexUser.id.toString();
                    const username = plexUser.username || plexUser.title || plexUser.email;
                    const avatarUrl = plexUser.thumb;

                    // Check if this user is in the admin list
                    const adminUsernames = (process.env.ADMIN_USERNAMES || "").split(",").map(s => s.trim().toLowerCase());
                    const isAdmin = adminUsernames.includes(username.toLowerCase());

                    // Upsert the user in our database
                    const dbUser = await prisma.user.upsert({
                        where: { plexId },
                        update: {
                            username,
                            avatarUrl,
                            plexToken: authToken,
                            isAdmin,
                        },
                        create: {
                            plexId,
                            username,
                            avatarUrl,
                            plexToken: authToken,
                            isAdmin,
                        },
                    });

                    return {
                        id: dbUser.id,
                        plexId: dbUser.plexId,
                        name: dbUser.username,
                        image: dbUser.avatarUrl,
                        plexToken: authToken, // We need to store this in the session
                        isAdmin: dbUser.isAdmin
                    };

                } catch (error) {
                    console.error("Plex Auth Error:", error);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.plexId = user.plexId;
                token.plexToken = user.plexToken;
                token.isAdmin = user.isAdmin;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.plexId = token.plexId as string;
                session.user.plexToken = token.plexToken as string;
                session.user.isAdmin = token.isAdmin as boolean;
            }
            return session;
        },
    },
    pages: {
        signIn: "/auth/signin",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
