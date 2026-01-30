const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());

async function scrapeCalendar() {
    const url = 'https://nepalicalendar.rat32.com/';
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const container = $('#tym4mob');

        // Extract the background color from the style attribute
        const styleAttr = container.attr('style') || "";
        const isHoliday = styleAttr.includes('background:#a60000') || styleAttr.includes('background:red');

        return {
            miti: container.children().eq(0).text().trim(),
            tithi: container.children().eq(1).text().trim(),
            date: container.children().eq(3).text().trim(),
            event: container.children().eq(4).text().trim(),
            isHoliday: isHoliday,
            accent: "#a60000" // Your holiday accent color
        };
    } catch (error) {
        console.error("Scraping error:", error);
        return null;
    }
}

// --- ROUTES ---

app.get('/fast', async (req, res) => {
    const data = await scrapeCalendar();
    if (!data) return res.status(500).json({ error: "Failed to fetch data" });

    const mitiParts = data.miti.split(' ');
    const shortMiti = `${mitiParts[0]} ${mitiParts[1]}`;

    // Apply color to the title if it's a holiday
    const titleColor = data.isHoliday ? data.accent : "#ffffff";
    const holidayTag = data.isHoliday ? " (Holiday)" : "";

    let tooltipLines = [
        `<span foreground="${titleColor}"><b>${data.miti}${holidayTag}</b></span>`,
        `Tithi: ${data.tithi}`,
        `Date: ${data.date}`
    ];

    if (data.event) {
        tooltipLines.push(`Event: ${data.event}`);
    }

    res.json({
        text: shortMiti,
        tooltip: tooltipLines.join('\n'),
        isHoliday: data.isHoliday
    });
});

app.get('/detailed', async (req, res) => {
    const data = await scrapeCalendar();
    if (!data) return res.status(500).json({ error: "Failed to fetch data" });

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
        event: data.event,
        isHoliday: data.isHoliday
    });
});

app.listen(PORT, () => {
    console.log(`✅ Patro API running at http://localhost:${PORT}`);
});