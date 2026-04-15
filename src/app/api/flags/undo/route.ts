import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { ratingKey } = await req.json();

        if (!ratingKey) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Find the media item ID first
        const mediaItem = await prisma.mediaItem.findUnique({
            where: { plexRatingKey: ratingKey }
        });

        if (!mediaItem) {
            return NextResponse.json({ error: "Media item not found" }, { status: 404 });
        }

        // Delete the flag request
        await prisma.flagRequest.deleteMany({
            where: {
                userId: session.user.id,
                mediaItemId: mediaItem.id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting flag request:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
