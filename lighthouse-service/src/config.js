module.exports = {
    rabbitmq: {
        url: 'amqp://guest:guest@localhost:5672',
        queue: 'lighthouse-audits-queue', // A new, dedicated queue
    },
    backend: {
        apiUrl: 'http://localhost:8080/api/jobs/me',
    },
};
