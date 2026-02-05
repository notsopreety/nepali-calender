const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());

/**
 * Core Scraper Function
 * Targets the highlighted cell with the radial-gradient background
 */
async function scrapeCalendar() {
    const url = 'https://nepalicalendar.rat32.com/';
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        // 1. Find the month/year header (e.g., "Magh 2082")
        const monthYear = $('.month-name').first().text().trim();

        // 2. Locate today's cell using the unique radial-gradient style
        const todayCell = $('.cells').filter((i, el) => {
            const style = $(el).attr('style') || "";
            return style.includes('radial-gradient');
        });

        if (todayCell.length === 0) return null;

        // 3. Extract data from the specific cell
        const gatey = todayCell.find('#nday').text().trim();
        const tithi = todayCell.find('#dashi').text().trim();
        const engDay = todayCell.find('#eday').text().trim();
        const eventText = todayCell.find('#fest').text().trim();

        // 4. Determine holiday status based on the 'color' attribute of the font tag inside #fest
        const festColor = todayCell.find('#fest font').attr('color');
        const isHoliday = (festColor === 'red' || festColor === '#ff0000');

        // 5. Build the Miti string
        // We'll also try to find the Day name (Sunday, Monday, etc.)
        // This is usually the index of the cell (0-6)
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const cellId = todayCell.attr('id'); // e.g., "Cell1"
        const cellIdx = parseInt(cellId.replace('Cell', '')) % 7;
        const dayName = dayNames[cellIdx];

        return {
            gatey,
            monthYear,
            dayName,
            tithi,
            engDay,
            event: eventText,
            isHoliday,
            accent: "#a60000"
        };
    } catch (error) {
        console.error("Scraping error:", error);
        return null;
    }
}

// --- API Routes ---

/**
 * /fast - Optimized for Rofi tooltips with Pango markup
 */
app.get('/fast', async (req, res) => {
    const data = await scrapeCalendar();
    if (!data) return res.status(500).json({ error: "Failed to fetch calendar data" });

    const color = data.isHoliday ? data.accent : "#33CCFF";
    const fullMiti = `${data.gatey} ${data.monthYear} ${data.dayName}`;
    
    let tooltipLines = [
        `<span foreground="${color}"><b>${fullMiti}</b></span>`,
        `Tithi: ${data.tithi}`,
        `Date: ${data.engDay}`
    ];

    if (data.event) {
        tooltipLines.push(`<span foreground="${color}">Event: ${data.event}</span>`);
    }

    res.json({
        text: `${data.gatey} ${data.monthYear.split(' ')[0]}`, // e.g., "22 Magh"
        tooltip: tooltipLines.join('\n'),
        isHoliday: data.isHoliday
    });
});

/**
 * /detailed - Returns structured JSON for logic processing
 */
app.get('/detailed', async (req, res) => {
    const data = await scrapeCalendar();
    if (!data) return res.status(500).json({ error: "Data fetch failed" });

    res.json({
        miti: {
            gatey: data.gatey,
            mahina: data.monthYear.split(' ')[0],
            barsa: data.monthYear.split(' ')[1],
            baar: data.dayName
        },
        tithi: data.tithi,
        event: data.event,
        isHoliday: data.isHoliday,
        englishDay: data.engDay
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Patro API active at http://localhost:${PORT}`);
});

// For Vercel deployment
module.exports = app;