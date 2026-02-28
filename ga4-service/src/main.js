const amqp = require('amqplib');
const config = require('./config');
const { processAnalyticsJob } = require('./ga4');

async function main() {
    console.log('[GA4] Connecting to RabbitMQ...');
    try {
        const connection = await amqp.connect(config.rabbitmq.url);
        const channel = await connection.createChannel();

        await channel.assertQueue(config.rabbitmq.queue, { durable: true });
        channel.prefetch(1);

        console.log(`[GA4] Waiting for messages in queue: ${config.rabbitmq.queue}`);

        channel.consume(config.rabbitmq.queue, async (msg) => {
            if (msg !== null) {
                try {
                    const jobDetails = JSON.parse(msg.content.toString());
                    await processAnalyticsJob(jobDetails);
                    channel.ack(msg);
                } catch (err) {
                    console.error('[GA4] Error processing message:', err.message);
                    // Ack anyway to prevent retry loops on malformed messages
                    channel.ack(msg);
                }
            }
        });
    } catch (error) {
        console.error('[GA4] Failed to start:', error.message);
        process.exit(1);
    }
}

main();
