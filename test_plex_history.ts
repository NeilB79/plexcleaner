import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const PLEX_URL = process.env.PLEX_SERVER_URL;
    const ADMIN_TOKEN = process.env.PLEX_ADMIN_TOKEN;

    try {
        // Grandparent 561 is Star Trek Lower Decks from our previous debug
        const historyUrl = `${PLEX_URL}/status/sessions/history/all?X-Plex-Token=${ADMIN_TOKEN}&grandparentKey=/library/metadata/561`;
        const historyResponse = await axios.get(historyUrl, { headers: { Accept: "application/json" } });

        const historyUrlMovie = `${PLEX_URL}/status/sessions/history/all?X-Plex-Token=${ADMIN_TOKEN}&ratingKey=12345`; // Dummy check

        const out = {
            showHistory: historyResponse.data.MediaContainer?.Metadata || [],
        };
        fs.writeFileSync('plex_history_debug.json', JSON.stringify(out, null, 2));
        console.log("Wrote plex_history_debug.json");
    } catch (e: any) {
        console.error(e.response?.data || e.message);
    }
}
run();
