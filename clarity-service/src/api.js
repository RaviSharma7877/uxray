const axios = require('axios');
const config = require('./config');

const backendApi = axios.create({
    baseURL: config.backend.apiUrl,
});

async function updateJobWithClarity(jobId, clarityData) {
    try {
        // Clean up the data - remove any undefined/null values that might cause issues
        const cleanedData = {
            totalSessions: clarityData.totalSessions ?? null,
            totalRecordings: clarityData.totalRecordings ?? null,
            activeUsers: clarityData.activeUsers ?? null,
            averageEngagementSeconds: clarityData.averageEngagementSeconds ?? null,
            averageScrollDepth: clarityData.averageScrollDepth ?? null,
            rageClicks: clarityData.rageClicks ?? null,
            deadClicks: clarityData.deadClicks ?? null,
            quickBacks: clarityData.quickBacks ?? null,
            topIssues: clarityData.topIssues || [],
            heatmaps: clarityData.heatmaps || [],
            standoutSessions: clarityData.standoutSessions || [],
            // New detailed data fields
            trafficSources: clarityData.trafficSources || [],
            browsers: clarityData.browsers || [],
            devices: clarityData.devices || [],
            operatingSystems: clarityData.operatingSystems || [],
            countries: clarityData.countries || [],
            pageTitles: clarityData.pageTitles || [],
            performanceMetrics: clarityData.performanceMetrics || null,
            diagnosticEvents: clarityData.diagnosticEvents || [],
            pageEvents: clarityData.pageEvents || null,
            customEvents: clarityData.customEvents || [],
        };

        console.log(`[API] Sending Clarity data to backend for job ${jobId}`);
        const response = await backendApi.patch(`/${jobId}/clarity`, cleanedData);
        console.log(`[API] Successfully updated Clarity data for job ${jobId}`, {
            status: response.status,
            dataReceived: {
                totalSessions: cleanedData.totalSessions,
                topIssues: cleanedData.topIssues.length,
                heatmaps: cleanedData.heatmaps.length,
                sessions: cleanedData.standoutSessions.length,
                trafficSources: cleanedData.trafficSources.length,
                browsers: cleanedData.browsers.length,
                devices: cleanedData.devices.length,
                diagnosticEvents: cleanedData.diagnosticEvents.length,
            }
        });
    } catch (error) {
        console.error(`[API] Failed to update Clarity data for job ${jobId}:`, error.message);
        if (error.response) {
            console.error(`[API] Response status: ${error.response.status}`);
            console.error(`[API] Response data:`, JSON.stringify(error.response.data, null, 2));
        }
        throw error; // Re-throw so the worker can handle it
    }
}

module.exports = { updateJobWithClarity };

