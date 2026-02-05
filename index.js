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
        
        // Find the cell that is highlighted as "Today" via the radial-gradient style
        const todayCell = $('.cells').filter((i, el) => {
            const style = $(el).attr('style') || "";
            return style.includes('radial-gradient');
        });

        // Determine if it's a holiday by checking if the font color in the fest div is red
        const festFontColor = todayCell.find('#fest font').attr('color');
        const isHoliday = (festFontColor === 'red' || festFontColor === '#ff0000');

        // Main container for textual data
        const container = $('#tym4mob');

        return {
            miti: container.children().eq(0).text().trim(),
            tithi: container.children().eq(1).text().trim(),
            date: container.children().eq(3).text().trim(),
            event: container.children().eq(4).text().trim(),
            isHoliday: isHoliday,
            accent: "#a60000" 
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

    const titleColor = data.isHoliday ? data.accent : "#ffffff";
    const holidayTag = data.isHoliday ? " (Holiday)" : "";

    let tooltipLines = [
        `<span foreground="${titleColor}"><b>${data.miti}${holidayTag}</b></span>`,
        `Tithi: ${data.tithi}`,
        `Date: ${data.date}`
    ];

    if (data.event) {
        // Adding color to the event line as well if it's a holiday
        const eventText = data.isHoliday ? `<span foreground="${data.accent}">Event: ${data.event}</span>` : `Event: ${data.event}`;
        tooltipLines.push(eventText);
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