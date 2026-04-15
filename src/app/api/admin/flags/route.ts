import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserMediaMetadata } from "@/lib/plex/client";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch all users who have logged in and provided a plexToken
        const allUsers = await prisma.user.findMany({
            where: {
                plexToken: { not: null }
            }
        });

        // Fetch all pending requests
        const pendingFlags = await prisma.flagRequest.findMany({
            where: {
                status: "pending",
            },
            include: {
                mediaItem: true,
                user: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Grouping logic
        const groupedFlags: Record<string, any> = {};
        for (const flag of pendingFlags) {
            const { mediaItem, user } = flag;
            if (!groupedFlags[mediaItem.id]) {
                groupedFlags[mediaItem.id] = {
                    mediaItem,
                    requests: [],
                    userWatchStatuses: []
                };
            }
            groupedFlags[mediaItem.id].requests.push({
                flagId: flag.id,
                user,
                createdAt: flag.createdAt,
            });
        }

        // Fetch cross-user watch statuses
        const groups = Object.values(groupedFlags);
        for (const group of groups) {
            const ratingKey = group.mediaItem.plexRatingKey;
            const flaggerIds = group.requests.map((r: any) => r.user.id);

            // We want to check users who did NOT flag it
            const usersToCheck = allUsers.filter(u => !flaggerIds.includes(u.id));

            const watchStatuses = await Promise.all(usersToCheck.map(async (u) => {
                if (!u.plexToken) return null;
                const metadata = await getUserMediaMetadata(ratingKey, u.plexToken);
                if (!metadata) return null;

                let isComplete = false;
                let watchText = "Unwatched";
                let percent = 0;

                if (group.mediaItem.type === "movie") {
                    isComplete = metadata.viewCount > 0;
                    if (isComplete) {
                        watchText = "Watched";
                        percent = 100;
                    } else if ((metadata.viewOffset || 0) > 0) {
                        watchText = "In Progress";
                        percent = 50;
                    }
                } else {
                    const total = metadata.leafCount || 0;
                    const watched = metadata.viewedLeafCount || 0;
                    isComplete = total > 0 && watched === total;
                    if (total > 0) percent = Math.round((watched / total) * 100);

                    if (isComplete) {
                        watchText = "Finished";
                    } else if (watched > 0) {
                        watchText = `${watched}/${total} eps watched`;
                    }
                }

                return {
                    username: u.username,
                    avatarUrl: u.avatarUrl,
                    isComplete,
                    watchText,
                    percent
                };
            }));

            group.userWatchStatuses = watchStatuses.filter(s => s !== null);
        }

        // Handle BigInt serialization for MediaItem.fileSize
        const serializedResponse = JSON.parse(JSON.stringify(groups, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
        ));

        return NextResponse.json(serializedResponse);
    } catch (error) {
        console.error("Error fetching admin flags:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { mediaItemId, action, adminNote } = await req.json(); // action can be "approve" or "keep"

        if (!mediaItemId || !["approve", "keep"].includes(action)) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }

        const newStatus = action === "approve" ? "approved" : "kept";

        // Update all pending requests for this media item
        await prisma.flagRequest.updateMany({
            where: {
                mediaItemId,
                status: "pending",
            },
            data: {
                status: newStatus,
                adminNote: action === "keep" ? (adminNote || null) : null,
            },
        });

        return NextResponse.json({ success: true, status: newStatus });
    } catch (error) {
        console.error("Error updating flag status:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
