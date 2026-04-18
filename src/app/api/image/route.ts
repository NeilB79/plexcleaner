import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");

    if (!path) {
        return new NextResponse("Missing path parameter", { status: 400 });
    }

    try {
        const plexUrl = process.env.PLEX_SERVER_URL;
        const adminToken = process.env.PLEX_ADMIN_TOKEN;
        
        const targetUrl = `${plexUrl}${path}?X-Plex-Token=${adminToken}`;

        const imageRes = await axios.get(targetUrl, { responseType: 'arraybuffer' });
        
        return new NextResponse(imageRes.data, {
            headers: {
                "Content-Type": imageRes.headers["content-type"] || "image/jpeg",
                "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200"
            }
        });
    } catch (error) {
        console.error("Image proxy error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
