const axios = require('axios');
const config = require('./config');

const backendApi = axios.create({
    baseURL: config.backend.apiUrl,
});

async function updateJobWithAnalytics(jobId, analyticsData) {
    try {
        await backendApi.patch(`/${jobId}/ga4`, analyticsData);
        console.log(`[API] Updated GA4 data for job ${jobId}`);
    } catch (error) {
        console.error(`[API] Failed to update GA4 data for job ${jobId}:`, error.message);
    }
}

module.exports = { updateJobWithAnalytics };
