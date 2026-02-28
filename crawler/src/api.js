const axios = require('axios');
const config = require('./config');

const backendApi = axios.create({
    baseURL: config.backend.apiUrl,
    withCredentials: true ,
});

async function updateJobStatus(jobId, status) {
    try {
        await backendApi.patch(`/${jobId}/status`, null, { params: { status } });
        console.log(`[API] Updated job ${jobId} status to ${status}`);
    } catch (error) {
        console.error(`[API] Failed to update status for job ${jobId}:`, error.message);
    }
}

async function addScreenshot(jobId, pageUrl, options = {}) {
    try {
        const payload = { pageUrl, ...options };
        Object.keys(payload).forEach((key) => {
            if (payload[key] === undefined || payload[key] === null) {
                delete payload[key];
            }
        });
        const response =  await backendApi.post(`/${jobId}/screenshots`, payload);
        console.log(`[API] Added screenshot for ${pageUrl} to job ${jobId}`);
        return response.data;
    } catch (error) {
        console.error(`[API] Failed to add screenshot for job ${jobId}:`, error.message);
    }
}

module.exports = {
    updateJobStatus,
    addScreenshot,
};
