import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const PLEX_URL = process.env.PLEX_SERVER_URL;
    const ADMIN_TOKEN = process.env.PLEX_ADMIN_TOKEN;

    // Fetch user details for the admin to get their plexId and also query the accounts
    // Actually just fetch the history and print the accountIDs attached to the items
    try {
        const historyUrl = `${PLEX_URL}/status/sessions/history/all?X-Plex-Token=${ADMIN_TOKEN}&limit=50`;
        const historyResponse = await axios.get(historyUrl, { headers: { Accept: "application/json" } });

        const accountsUrl = `${PLEX_URL}/accounts?X-Plex-Token=${ADMIN_TOKEN}`;
        const accountsResponse = await axios.get(accountsUrl, { headers: { Accept: "application/json" } });

        const out = {
            accounts: accountsResponse.data,
            historySample: historyResponse.data.MediaContainer?.Metadata?.slice(0, 5) || []
        };
        fs.writeFileSync('plex_debug.json', JSON.stringify(out, null, 2));
        console.log("Wrote plex_debug.json");
    } catch (e) {
        console.error(e);
    }
}
run();
