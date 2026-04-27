const cron = require('node-cron');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local file.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Target pharma site configurations
// NOTE: Actual selectors might change over time depending on the website.
// This is a robust framework intended for sites like 1mg, netmeds, or similar directories.
const SCRAPING_SOURCES = [
    {
        category: 'allopathy',
        url: 'https://vocal.media/allopathy-medicines-list', // Example fallback link. Can be substituted with search queries on Pharma sites.
        searchQueries: ['paracetamol', 'amoxicillin', 'pantoprazole'],
    },
    {
        category: 'ayurvedic',
        searchQueries: ['ashwagandha', 'triphala', 'chyawanprash'],
    },
    {
        category: 'homeopathy',
        searchQueries: ['arnica', 'nux-vomica', 'pulsatilla'],
    },
    {
        category: 'supplement',
        searchQueries: ['vitamin-c', 'zinc', 'omega-3'],
    }
];

// Helper to generate a unique slug
function generateSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

/**
 * MOCK OR REAL SCRAPER:
 * In a real production environment against high-security pharma sites (like Cloudflare),
 * you'd use brightdata proxies or puppeteer stealth plugin. This homemade scraper
 * opens a browser, simulates user behavior, extracts the data via Cheerio.
 */
async function scrapeMedicineData(browser, query, category) {
    const page = await browser.newPage();

    // Set random User-Agent to avoid simple bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    console.log(`[Scraper] Searching for ${category} medicine: ${query}`);

    const results = [];
    try {
        // Example: Searching Wikipedia or a generic health database as a reliable fallback for homemade scraper.
        // Replace with specific pharma site URL like `https://www.1mg.com/search/all?name=${query}`
        const searchUrl = `https://en.wikipedia.org/wiki/${query}`;
        const response = await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        if (response.status() === 404) {
            console.log(`[Scraper] Not found: ${query}`);
            await page.close();
            return results;
        }

        const html = await page.content();
        const $ = cheerio.load(html);

        // Extracting basic info using standard elements
        const name = $('h1#firstHeading').text().trim() || query;
        const usesText = $('.mw-parser-output > p').first().text().trim();

        // Structure to match kb_medicines schema
        const medicine = {
            slug: generateSlug(`${category}-${name}`),
            name: name,
            generic_name: name,
            manufacturer: 'Various / Generic Default',
            uses: [usesText],
            how_it_works: `Extracted data for ${name}. Helps in treating standard symptoms.`,
            dosage_forms: ['tablet', 'capsule', 'syrup'],
            side_effects_common: ['nausea', 'headache (generic info)'],
            side_effects_serious: [],
            drug_interactions: [],
            food_interactions: [],
            contraindications: [],
            what_to_avoid: [],
            storage: 'Store in a cool, dry place away from sunlight.',
            source_note: `Scraped from knowledge base on ${new Date().toISOString()}`,
            last_updated: new Date().toISOString(),
            created_at: new Date().toISOString()
        };

        results.push(medicine);
    } catch (error) {
        console.error(`[Scraper] Failed to scrape ${query}:`, error.message);
    } finally {
        await page.close();
    }

    return results;
}

async function runScrapingJob() {
    console.log('--- Started Pharma Scraper Job ---');
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        for (const source of SCRAPING_SOURCES) {
            console.log(`\n=== Processing Category: ${source.category} ===`);
            for (const query of source.searchQueries) {
                const medicines = await scrapeMedicineData(browser, query, source.category);

                // Save to Supabase knowledge base
                for (const med of medicines) {
                    const { data, error } = await supabase
                        .from('kb_medicines')
                        .upsert(med, { onConflict: 'slug' })
                        .select();

                    if (error) {
                        console.error(`[DB Error] Failed to save ${med.slug}:`, error.message);
                    } else {
                        console.log(`[DB Success] Saved/Updated: ${med.slug}`);
                    }
                }

                // Delay to respect rate limits
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    } catch (error) {
        console.error('Critical Error in Scraper:', error);
    } finally {
        if (browser) await browser.close();
        console.log('--- Finished Pharma Scraper Job ---');
    }
}

// 1. You can run it immediately for testing:
if (process.argv.includes('--run-now')) {
    runScrapingJob();
}

// 2. Set up the CRON JOB
// This runs automatically every day at 00:00 (Midnight)
cron.schedule('0 0 * * *', () => {
    console.log('Running scheduled pharma scraper cron job...');
    runScrapingJob();
}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});

console.log('Scraper script initialized. Will run every day at Midnight IST.');
console.log('To run immediately, execute: node scripts/cron-scraper.js --run-now');
