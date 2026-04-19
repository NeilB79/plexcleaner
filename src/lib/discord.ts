export async function sendDiscordNotification(message: string, embedData?: any) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
        const payload: any = { content: message };
        if (embedData) {
            payload.embeds = [embedData];
        }

        await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.error("Failed to send Discord webhook:", error);
    }
}
