import axios from 'axios';
import fs from 'fs';
import { parseStringPromise } from 'xml2js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const ADMIN_TOKEN = process.env.PLEX_ADMIN_TOKEN;

    try {
        const usersUrl = `https://plex.tv/api/users?X-Plex-Token=${ADMIN_TOKEN}`;
        const usersResponse = await axios.get(usersUrl, { headers: { Accept: "application/json" } });

        const parsed = await parseStringPromise(usersResponse.data);
        fs.writeFileSync('plex_users_debug.json', JSON.stringify(parsed, null, 2));
        console.log("Wrote plex_users_debug.json");
    } catch (e: any) {
        console.error(e.response?.data || e.message);
    }
}
run();
