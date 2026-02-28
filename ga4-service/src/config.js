require('dotenv').config();

module.exports = {
    rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
        queue: process.env.GA4_QUEUE || 'ga4-analytics-queue',
    },
    backend: {
        apiUrl: process.env.BACKEND_API_URL || 'http://localhost:8080/api/jobs',
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    pagespeed: {
        apiKey: process.env.PAGESPEED_API_KEY || '',
        urls: (process.env.PAGESPEED_URLS || '').split(',').filter(Boolean),
    },
    siteBaseUrl: process.env.SITE_BASE_URL || 'https://example.com',
};
