import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { getShowSeasons } from "@/lib/plex/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || !session?.user?.plexToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const ratingKey = url.searchParams.get("ratingKey");

        if (!ratingKey) {
            return NextResponse.json({ error: "Missing ratingKey" }, { status: 400 });
        }

        const seasons = await getShowSeasons(ratingKey, session.user.plexToken, session.user.plexId, session.user.isAdmin);

        return NextResponse.json(seasons);
    } catch (error) {
        console.error("Error fetching seasons:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
