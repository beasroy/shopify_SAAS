import crypto from 'crypto';

/**
 * Verify Shopify webhook signature
 * Ensures webhook is actually from Shopify
 */
export const verifyShopifyWebhook = (req, res, next) => {
  try {
    const hmacHeader = req.headers['x-shopify-hmac-sha256'];
    
    if (!hmacHeader) {
      console.error('❌ No HMAC header in request');
      return res.status(401).send('Unauthorized - No HMAC');
    }
    
    // Get raw body (must be raw for signature verification)
    const body = req.body;
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    
    // Calculate HMAC
    const hash = crypto
      .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
      .update(bodyString, 'utf8')
      .digest('base64');
    
    // Verify
    if (hash === hmacHeader) {
      // Parse body if it's a string
      if (typeof body === 'string') {
        req.body = JSON.parse(body);
      }
      next();
    } else {
      console.error('❌ Invalid HMAC signature');
      res.status(401).send('Unauthorized - Invalid HMAC');
    }
  } catch (error) {
    console.error('❌ Error verifying webhook:', error);
    res.status(500).send('Error');
  }
};

