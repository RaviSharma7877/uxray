const amqp = require('amqplib');
const config = require('./config');
const { processDesignInput } = require('./processor');

async function main() {
    console.log('[AMQP] Design Analysis service connecting to RabbitMQ...');
    try {
        const connection = await amqp.connect(config.rabbitmq.url);
        const channel = await connection.createChannel();
        
        await channel.assertQueue(config.rabbitmq.queue, { durable: true });
        channel.prefetch(1);
        
        console.log(`[AMQP] Waiting for design analysis requests in queue: ${config.rabbitmq.queue}`);

        channel.consume(config.rabbitmq.queue, async (msg) => {
            if (msg !== null) {
                const jobDetails = JSON.parse(msg.content.toString());
                await processDesignInput(jobDetails);
                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error('[AMQP] Failed to start Design Analysis service:', error.message);
        process.exit(1);
    }
}

main();
