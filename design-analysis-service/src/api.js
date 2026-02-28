const axios = require('axios');
const config = require('./config');

const backendApi = axios.create({
    baseURL: config.backend.apiUrl,
});

async function updateJobWithDesignAnalysis(jobId, analysisResults) {
    try {
        await backendApi.patch(`/${jobId}/design-analysis`, analysisResults);
        console.log(`[DESIGN] Updated design analysis for job ${jobId}`);
    } catch (error) {
        console.error(`[DESIGN] Failed to update design analysis for job ${jobId}:`, error.message);
    }
}

module.exports = { updateJobWithDesignAnalysis };
