import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMediaMetadata } from "@/lib/plex/client";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { ratingKey, title, type, thumbUrl, seasonNumber } = await req.json();

        if (!ratingKey || !title || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Fetch live metadata from Plex to ensure we have the latest file size/added date
        const metadata = await getMediaMetadata(ratingKey);

        // 2. Ensure MediaItem exists in DB
        const mediaItem = await prisma.mediaItem.upsert({
            where: { plexRatingKey: ratingKey },
            update: {
                title,
                type,
                seasonNumber,
                thumbUrl,
                fileSize: metadata?.fileSize || null,
                addedAt: metadata?.addedAt ? new Date(metadata.addedAt * 1000) : null,
            },
            create: {
                plexRatingKey: ratingKey,
                title,
                type,
                seasonNumber,
                thumbUrl,
                fileSize: metadata?.fileSize || null,
                addedAt: metadata?.addedAt ? new Date(metadata.addedAt * 1000) : null,
            },
        });

        // 3. Create or Update the FlagRequest
        const flagRequest = await prisma.flagRequest.upsert({
            where: {
                userId_mediaItemId: {
                    userId: session.user.id,
                    mediaItemId: mediaItem.id,
                },
            },
            update: {
                status: "pending", // Reset to pending if it was previously kept/rejected
            },
            create: {
                userId: session.user.id,
                mediaItemId: mediaItem.id,
                status: "pending",
            },
            include: {
                mediaItem: true,
            }
        });
        // Prisma BigInt fields cannot be natively serialized to JSON.
        const serializedRequest = JSON.parse(JSON.stringify(flagRequest, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return NextResponse.json(serializedRequest);
    } catch (error) {
        console.error("Error creating flag request:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const flags = await prisma.flagRequest.findMany({
            where: {
                userId: session.user.id,
                status: {
                    in: ["pending", "kept"],
                },
            },
            include: {
                mediaItem: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Prisma BigInt fields cannot be natively serialized to JSON.
        const serializedFlags = JSON.parse(JSON.stringify(flags, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
        ));

        return NextResponse.json(serializedFlags);
    } catch (error) {
        console.error("Error fetching flags:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
