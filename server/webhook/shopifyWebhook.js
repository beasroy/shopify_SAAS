import crypto from 'crypto';
import { fetchShopifyData } from '../controller/shopify.js';
import WebSocket,{WebSocketServer} from 'ws';
import { config } from 'dotenv';

config();

const SHOPIFY_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET 
let wss; // WebSocket server instance

// Function to initialize WebSocket server
export const initWebSocket = (server) => {
  wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => {
    console.log('New client connected');

    // Optional: handle disconnection
    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });
};

// Async function to handle Shopify webhook POST requests
export const handleShopifyWebhook = async (req, res) => {
  try {
    const hmac = req.get('X-Shopify-Hmac-SHA256');
    const body = JSON.stringify(req.body);

    // Step 1: HMAC Verification
    const generatedHmac = crypto
      .createHmac('sha256', SHOPIFY_SECRET)
      .update(body, 'utf8')
      .digest('base64');

    if (generatedHmac !== hmac) {
      return res.status(403).send('Invalid HMAC verification');
    }

    // Step 2: Process the webhook data
    const webhookData = req.body;
    console.log('Webhook received:', webhookData);

    // Step 3: Trigger your manual Shopify data fetch
    await fetchShopifyData(req, res);

    // Step 4: Notify all connected clients about the new data
    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(webhookData)); // Send the relevant data
        }
      });
    }

    // Step 5: Acknowledge Shopify that the webhook was processed
    res.status(200).send('Webhook processed and data fetched');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Server error processing webhook');
  }
};



