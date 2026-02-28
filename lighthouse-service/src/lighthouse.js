// We can now use require for our own local modules again
const api = require('./api');

// The main processing function is now fully async
async function processAudit(jobDetails) {
    console.log('[LIGHTHOUSE] Received raw job details:', JSON.stringify(jobDetails, null, 2));

    const { jobId, urlToAudit } = jobDetails;

    if (typeof jobId !== 'string' || jobId.trim() === '' || typeof urlToAudit !== 'string' || urlToAudit.trim() === '') {
        console.error('[LIGHTHOUSE] Validation Failed: Job details are missing or invalid.', jobDetails);
        return;
    }

    // --- DYNAMICALLY IMPORT MODULES INSIDE THE ASYNC FUNCTION ---
    // This is the core fix. The imports only happen when the function is called.
    const { default: lighthouse } = await import('lighthouse');
    const { launch: launchChrome } = await import('chrome-launcher');
    // --- END OF FIX ---

    console.log(`[LIGHTHOUSE] Starting audit for Job ID: ${jobId}, URL: ${urlToAudit}`);
    let chrome;
    try {
        chrome = await launchChrome({ chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox'] });
        const options = {
            logLevel: 'info',
            output: 'json',
            onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
            port: chrome.port,
        };

        const runnerResult = await lighthouse(urlToAudit, options);
        const report = JSON.parse(runnerResult.report);

        const scores = {
            mainPerformanceScore: Math.round(report.categories.performance.score * 100),
            mainAccessibilityScore: Math.round(report.categories.accessibility.score * 100),
            mainBestPracticesScore: Math.round(report.categories['best-practices'].score * 100),
            mainSeoScore: Math.round(report.categories.seo.score * 100),
        };
        
        console.log(`[LIGHTHOUSE] Audit complete for Job ${jobId}. Scores:`, scores);
        await api.updateJobWithScores(jobId, scores);

    } catch(error) {
        console.error(`[LIGHTHOUSE] Audit failed for ${urlToAudit}:`, error.message);
    } finally {
        if (chrome) {
            await chrome.kill();
        }
    }
}

// Export the function using standard CommonJS
module.exports = { processAudit };
