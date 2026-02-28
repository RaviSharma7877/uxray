require('dotenv').config();

module.exports = {
    rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
        queue: process.env.CLARITY_QUEUE || 'clarity-analytics-queue',
    },
    backend: {
        apiUrl: process.env.BACKEND_API_URL || 'http://localhost:8080/api/jobs',
    },
    clarity: {
        apiBaseUrl: process.env.CLARITY_API_BASE_URL || 'https://www.clarity.ms/export-data/api/v1',
        lookbackDays: parseInt(process.env.CLARITY_LOOKBACK_DAYS || '1', 10), // 1, 2, or 3 days only
        topEntries: parseInt(process.env.CLARITY_TOP_ENTRIES || '10', 10),
    },
};

