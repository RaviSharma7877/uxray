const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const path = require('path');
const { URL } = require('url');
const api = require('./api');
const config = require('./config');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// URL patterns to exclude from crawling
const EXCLUDED_PATTERNS = [
    '/login', '/signup', '/register', '/account', '/cart', '/checkout', '/privacy', '/terms', '/help', '/support', '/contact', '#',
];

// Check if a URL should be excluded based on patterns
function isUrlExcluded(url) {
    try {
        const urlPath = new URL(url).pathname;
        const urlHash = new URL(url).hash;
        if (urlPath === '/' && urlHash.length > 1) return true;
        return EXCLUDED_PATTERNS.some(pattern => (pattern === '#' ? url.includes('#') : urlPath.includes(pattern)));
    } catch (e) { return true; }
}

// Capture multiple viewport screenshots per page (scrolling down)
async function captureMultipleScreenshots(page, jobScreenshotDir, pageNum, url, numShots = 4) {
    const height = await page.evaluate(() => window.innerHeight);
    const totalScroll = await page.evaluate(() => document.body.scrollHeight);
    let screenshots = [];
    for (let i = 0; i < numShots; ++i) {
        const scrollTo = Math.floor((i * (totalScroll - height)) / Math.max(numShots - 1, 1));
        await page.evaluate(y => window.scrollTo(0, y), scrollTo);
        await sleep(600); // Let the page settle at new scroll position
        const screenshotFileName = `${pageNum}-${i + 1}.png`;
        const screenshotPath = path.join(jobScreenshotDir, screenshotFileName);
        const base64 = await page.screenshot({ path: screenshotPath, encoding: 'base64' });
        screenshots.push({ path: screenshotPath, num: i + 1, base64 });
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    return screenshots;
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

async function processJob(jobDetails) {
    const { jobId, startUrl, maxPages } = jobDetails;
    console.log(`[CRAWLER] Starting job ${jobId} for URL: ${startUrl}`);
    await api.updateJobStatus(jobId, 'IN_PROGRESS');

    const browser = await puppeteer.launch({ headless: true, defaultViewport: { width: 1280, height: 1024 } });
    const page = await browser.newPage();

    const visited = new Set();
    const queue = [startUrl];
    let pagesCrawled = 0;
    const jobScreenshotDir = path.join(config.screenshotDir, jobId);
    await fs.mkdir(jobScreenshotDir, { recursive: true });

    try {
        while (queue.length > 0 && pagesCrawled < maxPages) {
            const currentUrl = queue.shift();
            if (visited.has(currentUrl) || !currentUrl || isUrlExcluded(currentUrl)) {
                if (isUrlExcluded(currentUrl)) console.log(`[CRAWLER] Skipping excluded URL: ${currentUrl}`);
                continue;
            }
            console.log(`[CRAWLER] Crawling page (${pagesCrawled + 1}/${maxPages}): ${currentUrl}`);
            visited.add(currentUrl);

            try {
                await page.goto(currentUrl, {
                    waitUntil: 'domcontentloaded', // More forgiving than 'networkidle2'
                    timeout: 90000 // Raise the timeout (ms)
                });
                await autoScroll(page);
                await sleep(1500);

                // Take multiple screenshots for this page
                console.log(`[CRAWLER] Capturing multiple screenshots for ${currentUrl}`);
                const screenshots = await captureMultipleScreenshots(page, jobScreenshotDir, pagesCrawled + 1, currentUrl, 4);
                for (const s of screenshots) {
                    const fileName = `${pagesCrawled + 1}-${s.num}.png`;
                    const storagePath = `${jobId}/${fileName}`;
                    await api.addScreenshot(jobId, currentUrl, {
                        imageStoragePath: storagePath,
                        imageBase64: s.base64,
                        imageFileName: fileName,
                        imageContentType: 'image/png'
                    });
                }
                pagesCrawled++;
            } catch (err) {
                // Do not fail the whole job for a navigation timeout or error on this page
                console.error(`[CRAWLER] Failed to process ${currentUrl}:`, err.message);
            }

            let linksToCrawl;
            try {
                linksToCrawl = await page.evaluate((baseUrl) => {
                    const pageLinks = new Set();
                    const anchors = Array.from(document.querySelectorAll('a'));
                    for (const a of anchors) {
                        if (a.href && a.href.startsWith(baseUrl)) {
                            pageLinks.add(a.href.split('#')[0]);
                        }
                    }
                    return Array.from(pageLinks);
                }, new URL(startUrl).origin);
            } catch (e) {
                console.error(`[CRAWLER] Link extraction failed at ${currentUrl}:`, e.message);
                linksToCrawl = [];
            }
            linksToCrawl = linksToCrawl.filter(link => !isUrlExcluded(link) && !visited.has(link));
            for (const link of linksToCrawl) queue.push(link);
        }
        await api.updateJobStatus(jobId, 'COMPLETED');
        console.log(`[CRAWLER] Job ${jobId} completed successfully.`);
    } catch (error) {
        console.error(`[CRAWLER] Error processing job ${jobId}:`, error.message);
        await api.updateJobStatus(jobId, 'FAILED');
    } finally {
        await browser.close();
    }
}

module.exports = { processJob };
