const https = require("https");

const data = {
    name: "gta-news",
    description: "GTA Online Live News — every 2 hours",
    version: "1.0.0"
};

const ITALIAN_CHANNEL_ID = "1537221793922940928";
const ENGLISH_CHANNEL_ID = "901685831943733268";

const CHECK_EVERY = 2 * 60 * 60 * 1000;

const NEWSWIRE = {
    en: "https://www.rockstargames.com/newswire",
    it: "https://www.rockstargames.com/it/newswire"
};

let lastNews = {
    en: null,
    it: null
};

function getPage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        }, response => {

            let body = "";

            response.on("data", chunk => {
                body += chunk;
            });

            response.on("end", () => {
                resolve(body);
            });

        }).on("error", reject);
    });
}

function cleanText(text) {
    return text
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/\s+/g, " ")
        .trim();
}

function findNews(html) {

    const text = cleanText(html);

    const gtaOnline = text.match(
        /GTA Online.{0,1000}/i
    );

    if (!gtaOnline) {
        return null;
    }

    return gtaOnline[0].substring(0, 900);
}

async function sendNews(client, channelId, language, news) {

    const channel = await client.channels.fetch(channelId);

    if (!channel) return;

    const isItalian = language === "it";

    const title = isItalian
        ? "🔴 GTA ONLINE — NOTIZIE LIVE"
        : "🔴 GTA ONLINE — LIVE NEWS";

    const intro = isItalian
        ? "📰 **Ultime notizie di GTA Online da Rockstar Games**"
        : "📰 **Latest GTA Online news from Rockstar Games**";

    const source = isItalian
        ? "🔗 [Rockstar Newswire](https://www.rockstargames.com/it/newswire)"
        : "🔗 [Rockstar Newswire](https://www.rockstargames.com/newswire)";

    const embed = {
        title: title,
        description:
            `${intro}\n\n` +
            `${news}\n\n` +
            `${source}`,
        footer: {
            text: "⚜️ The Syndicate Staff Team"
        },
        timestamp: new Date().toISOString()
    };

    await channel.send({
        embeds: [embed]
    });
}

async function checkNews(client, language, channelId, force = false) {

    try {

        const html = await getPage(
            NEWSWIRE[language]
        );

        const news = findNews(html);

        if (!news) {
            console.log(
                `[GTA NEWS] No ${language} news found.`
            );
            return;
        }

        // Installation test:
        // send current news immediately.
        if (force) {

            lastNews[language] = news;

            await sendNews(
                client,
                channelId,
                language,
                news
            );

            console.log(
                `[GTA NEWS] ${language.toUpperCase()} installation news sent.`
            );

            return;
        }

        // Don't send duplicate news.
        if (news === lastNews[language]) {
            console.log(
                `[GTA NEWS] No new ${language} news.`
            );
            return;
        }

        lastNews[language] = news;

        await sendNews(
            client,
            channelId,
            language,
            news
        );

        console.log(
            `[GTA NEWS] New ${language.toUpperCase()} news sent.`
        );

    } catch (error) {

        console.error(
            `[GTA NEWS ${language.toUpperCase()} ERROR]`,
            error.message
        );
    }
}

async function execute(client) {

    console.log(
        "⚜️ THE SYNDICATE — GTA NEWS PLUGIN"
    );

    console.log(
        "📰 Starting GTA Online Live News..."
    );

    // ============================
    // INSTALLATION TEST
    // ============================

    await checkNews(
        client,
        "it",
        ITALIAN_CHANNEL_ID,
        true
    );

    await checkNews(
        client,
        "en",
        ENGLISH_CHANNEL_ID,
        true
    );

    // ============================
    // EVERY 2 HOURS
    // ============================

    setInterval(async () => {

        console.log(
            "🔄 Checking GTA Online News..."
        );

        await checkNews(
            client,
            "it",
            ITALIAN_CHANNEL_ID
        );

        await checkNews(
            client,
            "en",
            ENGLISH_CHANNEL_ID
        );

    }, CHECK_EVERY);
}

module.exports = {
    data,
    execute
};
