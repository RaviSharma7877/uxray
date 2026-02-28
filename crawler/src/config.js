module.exports = {
    rabbitmq: {
        url: 'amqp://guest:guest@localhost:5672',
        queue: 'screenshot-jobs-queue',
    },
    backend: {
        apiUrl: 'http://localhost:8080/api/jobs/me',
    },
    screenshotDir: 'screenshots'
};
