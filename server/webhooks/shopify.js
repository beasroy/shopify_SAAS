import axios from 'axios';
import Brand from '../models/Brands.js';
import User from '../models/User.js';


export function verifyWebhook(req, res, next) {
    const hmacHeader = req.headers['x-shopify-hmac-sha256'];
    
    if (!hmacHeader) {
      return res.status(401).send('HMAC validation failed');
    }
    
    const rawBody = JSON.stringify(req.body);
    const shopifySecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    
    const calculatedHmac = crypto
      .createHmac('sha256', shopifySecret)
      .update(rawBody, 'utf8')
      .digest('base64');
    
    if (calculatedHmac !== hmacHeader) {
      return res.status(401).send('HMAC validation failed');
    }
    
    next();
}
  
export const customersDataRequest = async (req, res) => {
    try {
      const { shop_domain, customer } = req.body;
      console.log(`Data request received for customer ${customer.id} from ${shop_domain}`);

      const timestamp = new Date().toISOString();
      const requestRecord = {
        type: 'data_request',
        shop: shop_domain,
        customerId: customer.id,
        timestamp: timestamp
      };
      
      console.log('GDPR Data Request Record:', requestRecord);
      res.status(200).send();
    } catch (error) {
      console.error('Error processing data request:', error);
      res.status(200).send();
    }
};

export const customersRedact = async (req, res) => {
    try {
      const { shop_domain, customer } = req.body;
      console.log(`Redact request received for customer ${customer.id} from ${shop_domain}`);
      
      const timestamp = new Date().toISOString();
      const redactionRecord = {
        type: 'customer_redact',
        shop: shop_domain,
        customerId: customer.id,
        timestamp: timestamp
      };
      
      console.log('GDPR Redaction Record:', redactionRecord);
      
      res.status(200).send();
    } catch (error) {
      console.error('Error processing redact request:', error);
     
      res.status(200).send();
    }
};

export const shopRedact = async (req, res) => {
    try {
      const { shop_domain } = req.body;
      console.log(`Shop redact request received for ${shop_domain}`);
      
      const timestamp = new Date().toISOString();
      const shopRedactionRecord = {
        type: 'shop_redact',
        shop: shop_domain,
        timestamp: timestamp
      };
      
      console.log('GDPR Shop Redaction Record:', shopRedactionRecord);
      
      // 2. Find any brands associated with this Shopify shop
      const brandsToDelete = await Brand.find({
        'shopifyAccount.shopName': shop_domain
      });
      
      if (brandsToDelete.length > 0) {
        console.log(`Found ${brandsToDelete.length} brands to delete for shop ${shop_domain}`);
        
        // Get brand IDs for later user cleanup
        const brandIds = brandsToDelete.map(brand => brand._id);
        
        // 3. Find users associated with these brands
        const usersToUpdate = await User.find({
          brands: { $in: brandIds },
          method: 'shopify'
        });
        
        console.log(`Found ${usersToUpdate.length} Shopify users associated with these brands`);
        
        for (const user of usersToUpdate) {
          user.brands = user.brands.filter(brandId => 
            !brandIds.some(id => id.equals(brandId))
          );
          
          if (user.brands.length === 0 && user.method === 'shopify') {
            console.log(`Deleting Shopify user: ${user.email}`);
            await User.deleteOne({ _id: user._id });
          } else {
            // Otherwise just update the user with the reduced brands list
            await user.save();
            console.log(`Updated brands for user: ${user.email}`);
          }
        }
        
        // 5. Delete the brands associated with this shop
        await Brand.deleteMany({
          'shopifyAccount.shopName': shop_domain
        });
        
        console.log(`Successfully deleted brands for shop ${shop_domain}`);
      } else {
        console.log(`No brands found for shop ${shop_domain}`);
      }
      
      // 6. Acknowledge the request
      res.status(200).send();
    } catch (error) {
      console.error('Error processing shop redact:', error);
      // Still return 200 to acknowledge receipt to Shopify
      res.status(200).send();
    }
};
  

export async function registerGDPRWebhooks(shop, accessToken) {
    const webhooks = [
      {
        topic: 'customers/data_request',
        address: `https://parallels.messold.com/api/shopify/webhooks/customers/data_request`,
        format: 'json'
      },
      {
        topic: 'customers/redact',
        address: `https://parallels.messold.com/api/shopify/webhooks/customers/redact`,
        format: 'json'
      },
      {
        topic: 'shop/redact',
        address: `https://parallels.messold.com/api/shopify/webhooks/shop/redact`,
        format: 'json'
      }
    ];
  
    try {
      // Create each webhook
      const results = await Promise.all(
        webhooks.map(webhookData => 
          axios({
            method: 'post',
            url: `https://${shop}/admin/api/2023-07/webhooks.json`,
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': accessToken
            },
            data: { webhook: webhookData } // Fixed: Correctly structure the webhook data
          })
        )
      );
      
      console.log('Successfully registered GDPR webhooks for', shop);
      return results.map(r => r.data.webhook);
    } catch (error) {
      // Improve error handling to continue even if one webhook fails
      if (error.response?.status === 404) {
        console.error('Invalid webhook topic:', error.response.data);
      } else if (error.response?.data) {
        console.error('Error registering webhooks:', error.response.data);
      } else {
        console.error('Error registering webhooks:', error.message);
      }
      throw error;
    }
  }
  