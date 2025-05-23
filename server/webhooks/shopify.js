import Brand from '../models/Brands.js';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import crypto from 'crypto';
import axios from 'axios';
import { config } from "dotenv";

config();

const mapPlanName = (shopifyPlanName) => {
  if (!shopifyPlanName) return 'Free Plan';

  if (shopifyPlanName.includes('Startup')) return 'Startup Plan';
  if (shopifyPlanName.includes('Growth')) return 'Growth Plan';

  return 'Free Plan';
};

const mapStatus = (shopifyStatus) => {
  if (!shopifyStatus) return 'pending';

  switch (shopifyStatus.toUpperCase()) {
    case 'ACTIVE': return 'active';
    case 'CANCELLED': return 'cancelled';
    case 'EXPIRED': return 'expired';
    case 'FROZEN': return 'frozen';
    case 'PENDING': return 'pending';
    default: return 'pending';
  }
};

const extractShopDomain = async (shopId) => {
  try {
    const shopRecord = await Brand.findOne({ 'shopifyAccount.shopId': shopId });

    if (shopRecord && shopRecord.shopifyAccount.shopName) {
      return shopRecord.shopifyAccount.shopName;
    }
    return null;
  } catch (error) {
    console.error('Error looking up shop domain in database:', error);
    return null;
  }
};


export function verifyWebhook(req, res, next) {
  try {
    const hmacHeader = req.headers['x-shopify-hmac-sha256'];
    if (!hmacHeader) {
      return res.status(401).send('HMAC validation failed');
    }

    const rawBody = req.rawBody.toString('utf8');
    const shopifySecret = process.env.SHOPIFY_CLIENT_SECRET;

    const calculatedHmac = crypto
      .createHmac('sha256', shopifySecret)
      .update(rawBody, 'utf8')
      .digest('base64');

    console.log('Received HMAC:', hmacHeader);
    console.log('Calculated HMAC:', calculatedHmac);

    if (calculatedHmac !== hmacHeader) {
      return res.status(401).send('HMAC validation failed');
    }
    next();
  } catch (error) {
    console.error('Error during webhook verification:', error);
    return res.status(401).send('HMAC validation failed');
  }
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

const fetchSubscriptionDetails = async (shop, accessToken, subscriptionGid) => {
  const query = `
    query {
      node(id: "${subscriptionGid}") {
        ... on AppSubscription {
          id
          name
          status
          trialDays
          createdAt
          currentPeriodEnd
          test
          lineItems {
            plan {
              pricingDetails {
                __typename
                ... on AppRecurringPricing {
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await axios.post(
    `https://${shop}/admin/api/2024-01/graphql.json`,
    { query },
    {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      }
    }
  );

  return response.data.data.node;
};

export const subscriptionUpdate = async (req, res) => {
  try {
    res.status(200).send('OK');
    console.log('Received subscription webhook:', JSON.stringify(req.body, null, 2));

    const data = req.body;
    const subscription = data.app_subscription;

    if (!subscription) {
      console.error('No subscription data in webhook');
      return;
    }

    const chargeId = subscription.admin_graphql_api_id.split('/').pop();
    const shopId = subscription.admin_graphql_api_shop_id.split('/').pop();

    let shopName = await extractShopDomain(shopId);
    if (!shopName) {
      console.error('Could not determine shop domain from ID:', shopId);
      return;
    }

    const brand = await Brand.findOne({ 'shopifyAccount.shopName': shopName });
    if (!brand) {
      console.error(`Brand not found for shop: ${shopName}`);
      return;
    }

    const accessToken = brand.shopifyAccount.shopifyAccessToken;

    const fullDetails = await fetchSubscriptionDetails(shopName, accessToken, subscription.admin_graphql_api_id);

    console.log(fullDetails);

    if (!fullDetails) {
      console.error('Failed to fetch full subscription details from Shopify');
      return;
    }

    const planName = fullDetails.name;
    const status = mapStatus(fullDetails.status);
    const price = parseFloat(fullDetails.lineItems?.[0]?.plan?.pricingDetails?.price?.amount || 0);
    const billingOn = fullDetails.currentPeriodEnd ? new Date(fullDetails.currentPeriodEnd) : null;
    const trialEndsOn = fullDetails.trialDays
      ? new Date(new Date(fullDetails.createdAt).getTime() + fullDetails.trialDays * 24 * 60 * 60 * 1000)
      : null;

    let subscriptionRecord = await Subscription.findOne({
      brandId: brand._id.toString(),
      shopId: shopId
    });

    if (subscriptionRecord) {
      subscriptionRecord.planName = planName;
      subscriptionRecord.status = status;
      subscriptionRecord.price = price;
      subscriptionRecord.billingOn = billingOn;
      subscriptionRecord.trialEndsOn = trialEndsOn;

      await subscriptionRecord.save();
      console.log(`Updated subscription for shop ${shopName}`);
    } else {
      // Create new
      subscriptionRecord = new Subscription({
        brandId: brand._id.toString(),
        shopId: shopId,
        chargeId: chargeId,
        planName: planName,
        status: status,
        price: price,
        billingOn: billingOn,
        trialEndsOn: trialEndsOn
      });

      await subscriptionRecord.save();
      console.log(`Created new subscription for shop ${shopName}`);
    }

  } catch (error) {
    console.error('Error processing subscription webhook:', error);
  }
};

export const app_uninstalled = async (req, res) => {
  try {
    const { shop_domain } = req.body;
    console.log(`Shop redact request received for ${shop_domain}`);

    const brandsToDelete = await Brand.find({
      'shopifyAccount.shopName': shop_domain
    });

    if (brandsToDelete.length > 0) {
      console.log(`Found ${brandsToDelete.length} brands to delete for shop ${shop_domain}`);


      const brandIds = brandsToDelete.map(brand => brand._id);

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

    res.status(200).send();
  } catch (error) {
    console.error('Error processing shop redact:', error);
    res.status(200).send();
  }
}

export async function registerWebhooks(shop, accessToken) {

  const apiVersion = '2024-04';

  const webhooks = [
    {
      topic: 'app_subscriptions/update',
      address: `https://parallels.messold.com/api/shopify/webhooks/app_subscriptions/update`,
      format: 'json'
    },
    {
      topic: 'app/uninstalled',
      address: `https://parallels.messold.com/api/shopify/webhooks/app_uninstalled`,
      format: 'json'
    }
  ];

  const results = [];

  for (const webhookData of webhooks) {
    try {
      const response = await axios({
        method: 'post',
        url: `https://${shop}/admin/api/${apiVersion}/webhooks.json`,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken
        },
        data: { webhook: webhookData }
      });

      console.log(`Successfully registered ${webhookData.topic} webhook for ${shop}`);
      results.push(response.data.webhook);
    } catch (error) {
      console.error(`Error registering ${webhookData.topic} webhook:`,
        error.response?.data?.errors || error.message);

    }
  }

  return results;
}
