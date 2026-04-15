import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { getUserLibraryItems } from "@/lib/plex/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || !session?.user?.plexToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Fetch entire user library from Plex
        const rawHistory = await getUserLibraryItems(session.user.plexToken, session.user.plexId, session.user.isAdmin);

        // 2. Extract the rating keys to see if this user has already flagged any of them
        const ratingKeys = rawHistory.map(h => h.ratingKey).filter(Boolean);

        // 3. Query the DB for any existing flags by this user for these items
        const existingFlags = await prisma.flagRequest.findMany({
            where: {
                userId: session.user.id,
                mediaItem: {
                    plexRatingKey: {
                        in: ratingKeys,
                    },
                },
            },
            include: {
                mediaItem: true,
            },
        });

        // 4. Map the flags back to the Plex history items
        const enrichedHistory = rawHistory.map(item => {
            const flag = existingFlags.find(f => f.mediaItem.plexRatingKey === item.ratingKey);
            return {
                ...item,
                flagStatus: flag ? flag.status : null,
            };
        });

        // Handle BigInt serialization for flag.mediaItem.fileSize
        const serializedHistory = JSON.parse(JSON.stringify(enrichedHistory, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
        ));

        return NextResponse.json(serializedHistory);
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
