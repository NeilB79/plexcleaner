import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const PLEX_URL = process.env.PLEX_SERVER_URL;
    const ADMIN_TOKEN = process.env.PLEX_ADMIN_TOKEN;

    try {
        const sectionsUrl = `${PLEX_URL}/library/sections?X-Plex-Token=${ADMIN_TOKEN}`;
        const sectionsRes = await axios.get(sectionsUrl, { headers: { Accept: "application/json" } });
        const sectionId = sectionsRes.data.MediaContainer.Directory.find((d: any) => d.type === 'show')?.key;

        if (sectionId) {
            const allUrl = `${PLEX_URL}/library/sections/${sectionId}/all?X-Plex-Token=${ADMIN_TOKEN}&type=2`; // type 2 is show
            const allRes = await axios.get(allUrl, { headers: { Accept: "application/json" } });

            const out = {
                metadataSample: allRes.data.MediaContainer?.Metadata?.slice(0, 5) || []
            };
            fs.writeFileSync('plex_library_debug.json', JSON.stringify(out, null, 2));
            console.log("Wrote plex_library_debug.json");
        }
    } catch (e) {
        console.error(e);
    }
}
run();
