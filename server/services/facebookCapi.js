import axios from "axios";
import crypto from "crypto";

FB_PIXEL_ID = process.env.META_DATASET_ID
FB_CAPI_ACCESS_TOKEN = process.env.META_CAPI_TOKEN
FB_API_VERSION = "v18.0"

const FB_URL = `https://graph.facebook.com/${FB_API_VERSION}/${FB_PIXEL_ID}/events`;

const hash = (value) => {
    if (!value) return undefined;
    return crypto
        .createHash("sha256")
        .update(value.toLowerCase().trim())
        .digest("hex");
};

export const sendFacebookEvent = async ({
    eventName,
    eventId,
    user,
    customData,
    eventSourceUrl
}) => {
    try {
        const payload = {
            data: [
                {
                    event_name: eventName,
                    event_time: Math.floor(Date.now() / 1000),
                    event_id: eventId,
                    action_source: "website",
                    event_source_url: eventSourceUrl,

                    user_data: {
                        em: hash(user?.email),
                        ph: hash(user?.phone),
                        client_ip_address: user?.ip,
                        client_user_agent: user?.userAgent
                    },

                    custom_data: customData
                }
            ]
        };

        const response = await axios.post(FB_URL, payload, {
            params: { access_token: FB_CAPI_ACCESS_TOKEN }
        });

        return response.data;
    } catch (error) {
        console.error(
            "Facebook CAPI Error:",
            error.response?.data || error.message
        );
    }
};