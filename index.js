const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Enable CORS so your frontend can access this API
app.use(cors());

/**
 * Core Scraper Function
 */
async function scrapeCalendar() {
    const url = 'https://nepalicalendar.rat32.com/';
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const container = $('#tym4mob');

        return {
            miti: container.children().eq(0).text().trim(),
            tithi: container.children().eq(1).text().trim(),
            date: container.children().eq(3).text().trim(),
            event: container.children().eq(4).text().trim()
        };
    } catch (error) {
        console.error("Scraping error:", error);
        return null;
    }
}

// --- ROUTES ---

/**
 * Route: /fast
 * Returns: { text: "...", tooltip: "..." }
 */
app.get('/fast', async (req, res) => {
    const data = await scrapeCalendar();
    if (!data) return res.status(500).json({ error: "Failed to fetch data" });

    // Extracting "11 Magh" from "11 Magh Sunday, 2082"
    const mitiParts = data.miti.split(' ');
    const shortMiti = `${mitiParts[0]} ${mitiParts[1]}`;

    // Formatting tooltip with bold HTML tags and newlines
    const tooltip = `<b>${data.miti}</b>\n` +
                    `Tithi: ${data.tithi}\n` +
                    `Date: ${data.date}\n` +
                    `Event: ${data.event}`;

    res.json({
        text: shortMiti,
        tooltip: tooltip
    });
});

/**
 * Route: /detailed
 * Returns: Full parsed object
 */
app.get('/detailed', async (req, res) => {
    const data = await scrapeCalendar();
    if (!data) return res.status(500).json({ error: "Failed to fetch data" });

    // Parsing miti for detailed view
    const mParts = data.miti.replace(',', '').split(' ');
    const dParts = data.date.replace(',', '').split(' ');

    res.json({
        miti: {
            gatey: mParts[0],
            mahina: mParts[1],
            baar: mParts[2],
            barsa: mParts[3]
        },
        date: {
            month: dParts[0],
            day: dParts[1],
            year: dParts[2]
        },
        tithi: data.tithi,
        event: data.event
    });
});

app.listen(PORT, () => {
    console.log(`Patro API running at http://localhost:${PORT}`);
});