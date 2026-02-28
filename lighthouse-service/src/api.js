const axios = require('axios');
const config = require('./config');

const backendApi = axios.create({
    baseURL: config.backend.apiUrl,
});

// This function updates the main Job record with scores.
async function updateJobWithScores(jobId, scores) {
    try {
        // This endpoint must match the one in your JobController
        await backendApi.patch(`/${jobId}/scores`, scores);
        console.log(`[API] Updated scores for main job ${jobId}`);
    } catch (error) {
        const errorMsg = error.response ? error.response.data : error.message;
        console.error(`[API] Failed to update scores for job ${jobId}:`, errorMsg);
    }
}

module.exports = {
    updateJobWithScores,
};
