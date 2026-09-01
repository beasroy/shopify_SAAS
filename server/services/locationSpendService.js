import axios from "axios";
import { GoogleAdsApi } from "google-ads-api";
import LocationAdSpend from "../models/LocationAdSpend.js";
import Brand from "../models/Brands.js";
import {
  GOOGLE_REGION_TO_STATE,
  STATE_TO_REGION,
  getRegionForState,
} from "../utils/locationDictionary.js";

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

export async function syncMetaLocationSpend(brandId, startDate, endDate) {
  console.log(
    `[Meta Spend Sync] Started for brand ${brandId} from ${formatDate(startDate)} to ${formatDate(endDate)}`,
  );
  const brand = await Brand.findById(brandId);
  if (
    !brand ||
    !brand.fbAccessToken ||
    !brand.fbAdAccounts ||
    brand.fbAdAccounts.length === 0
  ) {
    console.log(
      `[Meta Spend Sync] No Meta credentials for brand ${brandId}. Skipping.`,
    );
    return { success: false, reason: "No credentials" };
  }

  const fbToken = brand.fbAccessToken;
  let totalSaved = 0;
  const aggregatedData = {};

  for (const accountIdRaw of brand.fbAdAccounts) {
    const accountId = accountIdRaw.replace("act_", "");
    console.log(`[Meta Spend Sync] Fetching account ${accountId}...`);

    const params = new URLSearchParams({
      access_token: fbToken,
      fields: "spend",
      time_range: JSON.stringify({
        since: formatDate(startDate),
        until: formatDate(endDate),
      }),
      breakdowns: "region",
      time_increment: "1",
      limit: "5000",
    });

    let url = `https://graph.facebook.com/v22.0/act_${accountId}/insights?${params}`;
    let hasNext = true;

    while (hasNext) {
      try {
        const response = await axios.get(url);
        const data = response.data.data;

        if (!data || data.length === 0) {
          console.log(
            `[Meta Spend Sync] No data found in this page for account ${accountId}.`,
          );
          break;
        }

        for (const row of data) {
          const stateName = (row.region || "unknown").toLowerCase().trim();
          const spend = parseFloat(row.spend || 0);
          if (spend === 0) continue;

          const region = getRegionForState(stateName);
          const date = row.date_start;
          const key = `${date}_${region}`;

          if (!aggregatedData[key]) {
            aggregatedData[key] = { date, region, spend: 0 };
          }
          aggregatedData[key].spend += spend;
        }

        // Handle Pagination
        if (response.data.paging && response.data.paging.next) {
          url = response.data.paging.next;
        } else {
          hasNext = false;
        }
      } catch (error) {
        console.error(
          `[Meta Spend Sync] Error for account ${accountId}:`,
          error.response?.data?.error?.message || error.message,
        );
        hasNext = false;
      }
    }
  }

  const bulkOps = Object.values(aggregatedData).map((item) => ({
    updateOne: {
      filter: {
        brandId: brand._id,
        date: item.date,
        region: item.region,
      },
      update: {
        $set: { metaSpend: item.spend },
      },
      upsert: true,
    },
  }));

  if (bulkOps.length > 0) {
    await LocationAdSpend.bulkWrite(bulkOps, { ordered: false });
    totalSaved += bulkOps.length;
  }

  console.log(
    `[Meta Spend Sync] Finished. Processed ${totalSaved} daily state records.`,
  );
  return { success: true, recordsSaved: totalSaved };
}

export async function syncGoogleLocationSpend(brandId, startDate, endDate) {
  console.log(
    `[Google Spend Sync] Started for brand ${brandId} from ${formatDate(startDate)} to ${formatDate(endDate)}`,
  );
  const brand = await Brand.findById(brandId);

  if (
    !brand ||
    !brand.googleAdAccount ||
    brand.googleAdAccount.length === 0 ||
    !brand.googleAdsRefreshToken
  ) {
    console.log(
      `[Google Spend Sync] No Google credentials for brand ${brandId}. Skipping.`,
    );
    return { success: false, reason: "No credentials" };
  }

  try {
    const googleAdsClient = new GoogleAdsApi({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_AD_DEVELOPER_TOKEN,
    });

    let totalSaved = 0;
    // Aggregate by Date and Region for all accounts combined
    const aggregatedData = {};

    for (const googleAccount of brand.googleAdAccount) {
      console.log(
        `[Google Spend Sync] Fetching account ${googleAccount.clientId}...`,
      );
      const customer = googleAdsClient.Customer({
        customer_id: googleAccount.clientId,
        login_customer_id: googleAccount.managerId || googleAccount.clientId,
        refresh_token: brand.googleAdsRefreshToken,
      });

      const query = `
                SELECT
                    metrics.cost_micros,
                    segments.geo_target_region,
                    segments.date
                FROM
                    geographic_view
                WHERE
                    segments.date BETWEEN '${formatDate(startDate)}' AND '${formatDate(endDate)}'
                ORDER BY
                    segments.date ASC
            `;

      try {
        const results = await customer.query(query);

        // --- DYNAMIC GEO LOOKUP ---
        const unknownIds = new Set();
        for (const row of results) {
          const rawRegionId = row.segments?.geo_target_region;
          if (!rawRegionId) continue;
          const regionId = rawRegionId.replace("geoTargetConstants/", "");
          if (!GOOGLE_REGION_TO_STATE[regionId]) {
            unknownIds.add(regionId);
          }
        }

        const dynamicMapping = {};
        if (unknownIds.size > 0) {
          const idArray = Array.from(unknownIds);
          for (let i = 0; i < idArray.length; i += 100) {
            const chunk = idArray.slice(i, i + 100);
            try {
              const geoQuery = `
                SELECT geo_target_constant.id, geo_target_constant.canonical_name 
                FROM geo_target_constant 
                WHERE geo_target_constant.id IN (${chunk.join(",")})
              `;
              const geoRes = await customer.query(geoQuery);
              const knownStates = Object.keys(STATE_TO_REGION);
              for (const geoRow of geoRes) {
                const id = geoRow.geo_target_constant?.id;
                const canonical = (
                  geoRow.geo_target_constant?.canonical_name || ""
                ).toLowerCase();
                for (const state of knownStates) {
                  if (canonical.includes(state.toLowerCase())) {
                    dynamicMapping[id] = state;
                    break;
                  }
                }
              }
            } catch (e) {
              console.error(
                "[Google Spend Sync] Error resolving geo targets:",
                e.message,
              );
            }
          }
        }

        for (const row of results) {
          const rawRegionId = row.segments?.geo_target_region;
          if (!rawRegionId) continue;

          const regionId = rawRegionId.replace("geoTargetConstants/", "");
          const costMicros = parseInt(row.metrics?.cost_micros || 0, 10);
          if (costMicros === 0) continue;

          const spend = costMicros / 1000000;
          const dateStr = row.segments.date;

          const stateName =
            GOOGLE_REGION_TO_STATE[regionId] || dynamicMapping[regionId];
          const finalStateName = stateName || `unknown_google_${regionId}`;
          const region = getRegionForState(finalStateName);

          const key = `${dateStr}_${region}`;
          if (!aggregatedData[key]) {
            aggregatedData[key] = { date: dateStr, region, spend: 0 };
          }
          aggregatedData[key].spend += spend;
        }
      } catch (err) {
        console.error(
          `[Google Spend Sync] Error fetching for account ${googleAccount.clientId}:`,
          err.message,
        );
      }
    }

    const bulkOps = Object.values(aggregatedData).map((item) => ({
      updateOne: {
        filter: {
          brandId: brand._id,
          date: item.date,
          region: item.region,
        },
        update: {
          $set: { googleSpend: item.spend },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await LocationAdSpend.bulkWrite(bulkOps, { ordered: false });
      totalSaved += bulkOps.length;
    }

    console.log(
      `[Google Spend Sync] Finished. Processed ${totalSaved} daily state records.`,
    );
    return { success: true, recordsSaved: totalSaved };
  } catch (error) {
    console.error(`[Google Spend Sync] Error:`, error.message);
    return { success: false, reason: error.message };
  }
}

export async function syncAllLocationSpend(brandId, startDate, endDate) {
  try {
    const [metaResult, googleResult] = await Promise.all([
      syncMetaLocationSpend(brandId, startDate, endDate),
      syncGoogleLocationSpend(brandId, startDate, endDate),
    ]);

    return {
      success: true,
      meta: metaResult,
      google: googleResult,
    };
  } catch (error) {
    console.error(
      `[Sync All Location Spend] Fatal error for brand ${brandId}:`,
      error,
    );
    return { success: false, error: error.message };
  }
}
