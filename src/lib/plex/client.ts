import axios from "axios";
import { parseStringPromise } from "xml2js";

const PLEX_URL = process.env.PLEX_SERVER_URL;
const ADMIN_TOKEN = process.env.PLEX_ADMIN_TOKEN;

export interface PlexMediaItem {
    ratingKey: string;
    title: string;
    type: "movie" | "show" | "season";
    thumbUrl: string;
    parentTitle?: string; // For Seasons
    grandparentTitle?: string; // For Episodes/Seasons
    viewCount: number;
    viewOffset?: number; // MS offset if partially watched
    leafCount?: number; // Total episodes in a show/season
    viewedLeafCount?: number; // Watched episodes in a show/season
    addedAt?: number;
    viewedAt?: number; // timestamp
    fileSize?: number; // bytes
}

// Fetch the libraries (Movies, TV Shows)
export async function getLibraries() {
    const url = `${PLEX_URL}/library/sections?X-Plex-Token=${ADMIN_TOKEN}`;
    const response = await axios.get(url, { headers: { Accept: "application/json" } });
    return response.data.MediaContainer.Directory.map((dir: any) => ({
        key: dir.key,
        title: dir.title,
        type: dir.type, // 'movie' or 'show'
    }));
}

// Fetch all library items (Movies and Shows) for the specific user so we can see Unwatched vs Watched
export async function getUserLibraryItems(userToken: string, accountId: string, isAdmin?: boolean): Promise<PlexMediaItem[]> {
    try {
        const localAccountId = isAdmin ? "1" : accountId;

        // 1. Get all library sections
        const sectionsUrl = `${PLEX_URL}/library/sections?X-Plex-Token=${ADMIN_TOKEN}`;
        const sectionsRes = await axios.get(sectionsUrl, { headers: { Accept: "application/json" } });
        const directories = sectionsRes.data.MediaContainer?.Directory || [];

        let allItems: any[] = [];

        // 2. Query each section for all items
        for (const dir of directories) {
            // type 1 = movie, type 2 = show
            const typeParam = dir.type === 'movie' ? '1' : (dir.type === 'show' ? '2' : null);
            if (!typeParam) continue;

            const allUrl = `${PLEX_URL}/library/sections/${dir.key}/all?X-Plex-Token=${userToken}&type=${typeParam}`;
            const allRes = await axios.get(allUrl, { headers: { Accept: "application/json" } });

            let metadata = allRes.data.MediaContainer?.Metadata || [];

            // Filter by user account ID if it's bleeding through (though userToken usually scopes it)
            metadata = metadata.filter((i: any) => !i.accountID || i.accountID.toString() === localAccountId);

            allItems = [...allItems, ...metadata];
        }

        return allItems.filter(item => item && item.ratingKey).map(mapPlexResponseToMediaItem);
    } catch (err) {
        console.error("Error fetching full user library from Plex:", err);
        return [];
    }
}

// Fetch seasons for a specific show
export async function getShowSeasons(showRatingKey: string, userToken: string, accountId: string, isAdmin?: boolean): Promise<PlexMediaItem[]> {
    try {
        const localAccountId = isAdmin ? "1" : accountId;
        // The children endpoint works well, but we need to pass userToken to get specific view statuses.
        const url = `${PLEX_URL}/library/metadata/${showRatingKey}/children?X-Plex-Token=${userToken}`;
        const response = await axios.get(url, { headers: { Accept: "application/json" } });

        let metadata = response.data.MediaContainer?.Metadata || [];

        // Filter by user account ID if present, else just map it
        metadata = metadata.filter((i: any) => !i.accountID || i.accountID.toString() === localAccountId);

        return metadata.filter((item: any) => item && item.ratingKey).map(mapPlexResponseToMediaItem);
    } catch (err) {
        console.error(`Error fetching seasons for show ${showRatingKey}:`, err);
        return [];
    }
}

// Helper to map Plex JSON to our internal type
function mapPlexResponseToMediaItem(item: any): PlexMediaItem {
    // console.log("PlexItem:", item.title, "viewedAt:", item.viewedAt, "lastViewedAt:", item.lastViewedAt);

    // Extract file size if available (usually in item.Media[0].Part[0].size)
    let fileSize = 0;
    if (item.Media && item.Media[0] && item.Media[0].Part && item.Media[0].Part[0]) {
        fileSize = parseInt(item.Media[0].Part[0].size, 10);
    }

    // Convert episode views into season groupings so the UI only displays Show/Season levels
    if (item.type === "episode") {
        return {
            ratingKey: item.parentKey ? item.parentKey.split("/").pop()! : item.ratingKey,
            title: `Season ${item.parentIndex || 1}`,
            type: "season",
            thumbUrl: `${PLEX_URL}${item.parentThumb || item.thumb}?X-Plex-Token=${ADMIN_TOKEN}`,
            parentTitle: item.grandparentTitle, // The Show Name
            viewCount: item.viewCount || 0,
            viewOffset: item.viewOffset,
            addedAt: item.addedAt,
            viewedAt: item.lastViewedAt || item.viewedAt,
            fileSize
        };
    }

    return {
        ratingKey: item.ratingKey,
        title: item.title,
        type: item.type === "episode" ? "show" : item.type, // Normalize episode up to show for our app's UI
        thumbUrl: `${PLEX_URL}${item.thumb}?X-Plex-Token=${ADMIN_TOKEN}`, // Use admin token to fetch images reliably
        parentTitle: item.parentTitle,
        grandparentTitle: item.grandparentTitle,
        viewCount: item.viewCount || 0,
        viewOffset: item.viewOffset,
        leafCount: item.leafCount,
        viewedLeafCount: item.viewedLeafCount,
        addedAt: item.addedAt,
        viewedAt: item.lastViewedAt || item.viewedAt,
        fileSize,
    };
}

// Get rich metadata for a specific item (for the Admin dashboard)
export async function getMediaMetadata(ratingKey: string): Promise<PlexMediaItem | null> {
    try {
        const url = `${PLEX_URL}/library/metadata/${ratingKey}?X-Plex-Token=${ADMIN_TOKEN}`;
        const response = await axios.get(url, { headers: { Accept: "application/json" } });
        const item = response.data.MediaContainer?.Metadata?.[0];
        if (!item) return null;
        return mapPlexResponseToMediaItem(item);
    } catch (err) {
        console.error(`Error fetching metadata for ${ratingKey}:`, err);
        return null;
    }
}

// Get watch state for a specific item using a specific user's token
export async function getUserMediaMetadata(ratingKey: string, userToken: string): Promise<PlexMediaItem | null> {
    try {
        const url = `${PLEX_URL}/library/metadata/${ratingKey}?X-Plex-Token=${userToken}`;
        const response = await axios.get(url, { headers: { Accept: "application/json" } });
        const item = response.data.MediaContainer?.Metadata?.[0];
        if (!item) return null;
        return mapPlexResponseToMediaItem(item);
    } catch (err) {
        console.error(`Error fetching user metadata for ${ratingKey}:`, err);
        return null;
    }
}
