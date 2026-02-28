const amqp = require('amqplib');
const config = require('./config');
const { processClarityJob } = require('./clarity');

async function main() {
    console.log('[Clarity] Connecting to RabbitMQ...');
    try {
        const connection = await amqp.connect(config.rabbitmq.url);
        const channel = await connection.createChannel();

        await channel.assertQueue(config.rabbitmq.queue, { durable: true });
        channel.prefetch(1);

        console.log(`[Clarity] Waiting for messages in queue: ${config.rabbitmq.queue}`);

        channel.consume(config.rabbitmq.queue, async (msg) => {
            if (msg !== null) {
                try {
                    const messageContent = msg.content.toString();
                    console.log(`[Clarity] Received message from queue: ${messageContent}`);
                    const jobDetails = JSON.parse(messageContent);
                    console.log(`[Clarity] Parsed job details:`, {
                        jobId: jobDetails.jobId,
                        hasApiKey: !!jobDetails.apiKey,
                        projectId: jobDetails.projectId,
                        siteUrl: jobDetails.siteUrl,
                        lookbackDays: jobDetails.lookbackDays
                    });
                    await processClarityJob(jobDetails);
                    channel.ack(msg);
                    console.log(`[Clarity] Successfully processed and acknowledged message for job ${jobDetails.jobId}`);
                } catch (err) {
                    console.error('[Clarity] Error processing message:', err.message);
                    console.error('[Clarity] Error stack:', err.stack);
                    // Ack anyway to prevent retry loops on malformed messages
                    channel.ack(msg);
                }
            }
        });
    } catch (error) {
        console.error('[Clarity] Failed to start:', error.message);
        process.exit(1);
    }
}

main();

