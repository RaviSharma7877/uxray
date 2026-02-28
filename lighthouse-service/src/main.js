// lighthouse-service/src/main.js

const amqp = require('amqplib');
const config = require('./config');
// This require() will now work correctly
const { processAudit } = require('./lighthouse');

async function main() {
    console.log('[AMQP] Lighthouse service connecting to RabbitMQ...');
    try {
        const connection = await amqp.connect(config.rabbitmq.url);
        const channel = await connection.createChannel();
        
        await channel.assertQueue(config.rabbitmq.queue, { durable: true });
        channel.prefetch(1);
        
        console.log(`[AMQP] Waiting for audit requests in queue: ${config.rabbitmq.queue}`);

        channel.consume(config.rabbitmq.queue, async (msg) => {
            if (msg !== null) {
                const jobDetails = JSON.parse(msg.content.toString());
                // Call the processing function
                await processAudit(jobDetails);
                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error('[AMQP] Failed to start Lighthouse service:', error.message);
        process.exit(1);
    }
}

main();
