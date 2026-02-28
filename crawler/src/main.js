const amqp = require('amqplib');
const express = require('express');
const path = require('path');
const config = require('./config');
const { processJob } = require('./crawler');

// --- Function to Start the Static File Server ---
function startStaticServer() {
    const app = express();
    const PORT = 8081; // The port we need for the images

    // The directory where screenshots are saved by the crawler
    const screenshotDir = path.join(__dirname, '..', config.screenshotDir);

    // Add CORS headers to allow frontend to access images
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    // Serve static files from the screenshots directory
    app.use(express.static(screenshotDir));

    app.listen(PORT, () => {
        console.log(`[SERVER] 🖼️  Image server running at http://localhost:${PORT}`);
        console.log(`[SERVER] Serving images from: ${screenshotDir}`);
    });

    // A simple health check endpoint for the server
    app.get('/health', (req, res) => {
        res.status(200).send('OK');
    });
}

// --- Function to Start the RabbitMQ Worker ---
async function startRabbitMQWorker() {
    console.log('[AMQP] Connecting to RabbitMQ...');
    try {
        const connection = await amqp.connect(config.rabbitmq.url);
        const channel = await connection.createChannel();
        
        await channel.assertQueue(config.rabbitmq.queue, { durable: true });
        channel.prefetch(1);
        
        console.log(`[AMQP] 🎧 Waiting for messages in queue: ${config.rabbitmq.queue}`);

        channel.consume(config.rabbitmq.queue, async (msg) => {
            if (msg === null) return;
            const messageContent = msg.content.toString();
            console.log(`[AMQP] Received raw message: ${messageContent}`);
            try {
                const jobDetails = JSON.parse(messageContent);
                await processJob(jobDetails);
                channel.ack(msg);
            } catch (error) {
                console.error('[AMQP] Failed to process job:', error);
                channel.nack(msg, false, false);
            }
        });
    } catch (error) {
        console.error('[AMQP] Failed to connect or setup RabbitMQ:', error.message);
        setTimeout(() => process.exit(1), 1000);
    }
}

// --- Main Function to Start Both Services ---
function main() {
    startStaticServer();    // Start the image server
    startRabbitMQWorker();  // Start the job processor
}

main();
