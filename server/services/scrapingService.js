import { ApifyClient } from "apify-client";
import mongoose from "mongoose";
import ScrapedBrand from "../models/ScrapedBrand.js";
import ScrapedAdDetail from "../models/ScrapedAdDetail.js";
import { getActiveStrategy } from "../config/scraperRegistry.js";

const client = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

const normalizePageUrl = (pageIdentifier) => {
  // If it's already a valid Ad Library search URL
  if (pageIdentifier.includes("/ads/library/")) {
    // The Actor's input schema STRICTLY requires 'q=' in the URL
    if (!pageIdentifier.includes("q=")) {
      return (
        pageIdentifier + (pageIdentifier.includes("?") ? "&" : "?") + "q=%20"
      );
    }
    return pageIdentifier;
  }

  let query = pageIdentifier;

  // If it's a full Facebook page URL, check its format
  if (pageIdentifier.startsWith("http")) {
    try {
      const urlObj = new URL(pageIdentifier);

      // Check if it's a profile.php URL with an ID (e.g. facebook.com/profile.php?id=123)
      if (
        urlObj.pathname.includes("profile.php") &&
        urlObj.searchParams.has("id")
      ) {
        const pageId = urlObj.searchParams.get("id");
        // Use exact page ID search (must include q= to satisfy actor regex)
        return `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=IN&view_all_page_id=${pageId}&search_type=page&q=${pageId}`;
      }

      // If it's a standard facebook.com URL (like facebook.com/Lenskartindia),
      // just return the URL directly! The scraper fully supports it!
      if (urlObj.hostname.includes("facebook.com")) {
        return pageIdentifier;
      }

      // Get the last path segment as the username (e.g., /saundhofficial)
      const parts = urlObj.pathname.split("/").filter(Boolean);
      if (parts.length > 0) {
        query = parts[parts.length - 1];
      }
    } catch (e) {
      // fallback
    }
  }

  // This actor REQUIRES the URL to be a Facebook Ad Library search URL containing "q="
  // Pattern required: "https:\/\/(www\.)?facebook\.com\/ads\/library\/.*q=.+"
  return `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=IN&q=${encodeURIComponent(query)}&search_type=keyword_unordered`;
};

/**
 * Fetch ads for a specific Facebook page using Apify
 * @param {string|string[]} pageIdentifier - Facebook page URL, username, page ID, or Ads Library URL
 *                                           Can also be an array for multiple pages
 * @param {Object} options - Additional options
 * @param {string[]} options.countries - Country codes (default: ['IN'])
 * @param {number} options.count - Maximum number of ads to fetch (default: 100)
 * @param {string} options.activeStatus - 'all', 'active', or 'inactive' (default: 'all')
 * @param {string} options.period - Date range in format "YYYY-MM-DD_YYYY-MM-DD" or empty for all time
 * @param {string} options.countryCode - 'ALL' for all countries, or specific country codes (default: uses countries array)
 * @returns {Promise<Object>} - Run information and results
 */
export const fetchPageAds = async (pageIdentifier, options = {}) => {
  const {
    countries = ["IN"],
    count = 100,
    activeStatus = "all",
    period = "",
    countryCode = null,
  } = options;

  try {
    // Handle both single page and multiple pages
    const pageIdentifiers = Array.isArray(pageIdentifier)
      ? pageIdentifier
      : [pageIdentifier];

    // Convert all identifiers to URLs
    const urls = pageIdentifiers.map((identifier) => ({
      url: normalizePageUrl(identifier),
    }));

    // Determine country code - use provided countryCode or join countries array
    const finalCountryCode =
      countryCode ||
      (countries.length === 1 && countries[0] === "IN" ? "IN" : "ALL");

    // Enforce maximum limit of 100 ads across all scraping requests
    const finalCount = Math.min(Number(count) || 100, 100);

    // Use the Strategy Registry to build actor-specific input
    const strategy = getActiveStrategy();
    const input = strategy.buildInput(
      urls.map((u) => u.url),
      {
        count: finalCount,
        activeStatus,
        countries,
        countryCode: finalCountryCode,
      },
    );

    console.log(
      `[Apify] Starting actor run for ${pageIdentifiers.length} page(s)`,
    );
    console.log(`[Apify] Input config:`, JSON.stringify(input, null, 2));

    // Run the Actor and wait for it to finish (matching documentation pattern)
    const run = await client.actor(strategy.actorId).call(input);

    console.log(`[Apify] Actor run started: ${run.id}`);
    console.log(`[Apify] Run status: ${run.status}`);

    // Wait for the run to complete
    const finishedRun = await client.run(run.id).waitForFinish();

    if (finishedRun.status === "SUCCEEDED") {
      console.log(`[Apify] Run ${run.id} completed successfully`);

      // Fetch and print Actor results from the run's dataset (matching documentation pattern)
      const { items } = await client
        .dataset(finishedRun.defaultDatasetId)
        .listItems();

      console.log(`[Apify] Retrieved ${items.length} ads from dataset`);

      return {
        success: true,
        runId: finishedRun.id,
        status: finishedRun.status,
        ads: items, // Raw Apify output - no transformation
        count: items.length,
        datasetId: finishedRun.defaultDatasetId,
      };
    } else {
      throw new Error(`Apify run failed with status: ${finishedRun.status}`);
    }
  } catch (error) {
    console.error(`[Apify] Error fetching ads:`, error);
    throw error;
  }
};

/**
 * Fetch ads for multiple pages in a single run
 * @param {string[]} pageIdentifiers - Array of Facebook page URLs, usernames, or page IDs
 * @param {Object} options - Same options as fetchPageAds
 * @returns {Promise<Object>} - Combined results from all pages
 */
export const fetchMultiplePageAds = async (pageIdentifiers, options = {}) => {
  // Use the main function which already supports arrays
  return await fetchPageAds(pageIdentifiers, options);
};

/**
 * Start an actor run without waiting (for async processing in workers)
 * @param {string|string[]} pageIdentifier - Facebook page URL, username, or page ID
 * @param {Object} options - Same options as fetchPageAds
 * @returns {Promise<Object>} - Run information (runId, status, etc.)
 */
export const startActorRun = async (pageIdentifier, options = {}) => {
  const {
    countries = ["IN"],
    count = 100,
    activeStatus = "all",
    period = "",
    countryCode = null,
  } = options;

  const pageIdentifiers = Array.isArray(pageIdentifier)
    ? pageIdentifier
    : [pageIdentifier];
  const urls = pageIdentifiers.map((identifier) => ({
    url: normalizePageUrl(identifier),
  }));

  const finalCountryCode =
    countryCode ||
    (countries.length === 1 && countries[0] === "IN" ? "IN" : "ALL");

  // Use the Strategy Registry to build actor-specific input
  const strategy = getActiveStrategy();
  const input = strategy.buildInput(
    urls.map((u) => u.url),
    { count, activeStatus, countries, countryCode: finalCountryCode },
  );

  console.log(
    `[Apify] Starting async actor run for ${pageIdentifiers.length} page(s)`,
  );

  // Run the Actor (without waiting)
  const run = await client.actor(strategy.actorId).call(input);

  return {
    runId: run.id,
    status: run.status,
    startedAt: run.startedAt,
    defaultDatasetId: run.defaultDatasetId,
  };
};

/**
 * Get run status without waiting
 * @param {string} runId - Apify run ID
 * @returns {Promise<Object>} - Run status information
 */
export const getRunStatus = async (runId) => {
  try {
    const run = await client.run(runId).get();
    return {
      id: run.id,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      defaultDatasetId: run.defaultDatasetId,
    };
  } catch (error) {
    console.error(`[Apify] Error getting run status for ${runId}:`, error);
    throw error;
  }
};

/**
 * Get results from a completed run
 * @param {string} runId - Apify run ID
 * @returns {Promise<Array>} - Array of ad items
 */
export const getRunResults = async (runId) => {
  try {
    const run = await client.run(runId).get();

    if (!run.defaultDatasetId) {
      throw new Error("Run has no dataset ID");
    }

    // Fetch results from dataset (matching documentation pattern)
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return items;
  } catch (error) {
    console.error(`[Apify] Error getting results for run ${runId}:`, error);
    throw error;
  }
};

/**
 * Poll for run completion (useful in workers)
 * @param {string} runId - Apify run ID
 * @param {number} maxWaitTime - Maximum time to wait in milliseconds (default: 30 minutes)
 * @param {number} pollInterval - Polling interval in milliseconds (default: 15 seconds)
 * @returns {Promise<Array>} - Array of ad items when completed
 */
export const waitForRunAndGetResults = async (
  runId,
  maxWaitTime = 30 * 60 * 1000,
  pollInterval = 15000,
) => {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const status = await getRunStatus(runId);

    if (status.status === "SUCCEEDED") {
      return await getRunResults(runId);
    }

    if (status.status === "FAILED" || status.status === "ABORTED") {
      throw new Error(
        `Apify run ${runId} failed with status: ${status.status}`,
      );
    }

    // Still running, wait and poll again
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(
    `Apify run ${runId} timeout - exceeded max wait time of ${maxWaitTime}ms`,
  );
};

/**
 * Quick test function to fetch Saund India page ads and save to database
 * Usage: import { testSaundIndia } from './services/apifyServiice.js'; await testSaundIndia();
 * Fetches ads and automatically saves them to the database
 */
export const testSaundIndia = async () => {
  try {
    console.log("[Test] Fetching and saving ads for Saund India page...");

    // Use fetchAndSavePageAds to fetch and save in one call
    const result = await fetchAndSavePageAds(
      "https://www.facebook.com/saundhofficial",
      {
        countries: ["IN"],
        count: 50,
        activeStatus: "all",
      },
    );

    // Log fetch results
    console.log(`[Test] Successfully fetched ${result.fetchResult.count} ads`);
    console.log(`[Test] Run ID: ${result.fetchResult.runId}`);

    // Log save results
    if (result.saveResult.scrapingBrand) {
      console.log(`[Test] ScrapingBrand saved/updated:`);
      console.log(`  - ID: ${result.saveResult.scrapingBrand._id}`);
      console.log(`  - Page URL: ${result.saveResult.scrapingBrand.pageUrl}`);
      console.log(
        `  - Page ID: ${result.saveResult.scrapingBrand.pageId || "Not extracted yet"}`,
      );
      console.log(
        `  - Page Name: ${result.saveResult.scrapingBrand.pageName || "Not extracted yet"}`,
      );
    }

    console.log(`[Test] Database save results:`);
    console.log(`  - Ads saved: ${result.saveResult.adsSaved}`);
    console.log(`  - Ads skipped: ${result.saveResult.adsSkipped}`);

    if (result.saveResult.errors && result.saveResult.errors.length > 0) {
      console.log(`  - Errors: ${result.saveResult.errors.length}`);
      result.saveResult.errors.forEach((err, index) => {
        console.log(`    Error ${index + 1}: ${err.error}`);
      });
    }

    // Show sample raw Apify output (first ad)
    if (result.fetchResult.ads && result.fetchResult.ads.length > 0) {
      console.log(`[Test] Sample raw ad (first item):`);
      console.dir(result.fetchResult.ads[0], { depth: 3 });
    }

    console.log(`[Test] Test completed successfully!`);

    return result;
  } catch (error) {
    console.error("[Test] Error:", error);
    throw error;
  }
};

/**
 * Example: Fetch multiple pages in one run (like documentation example)
 */
export const testMultiplePages = async () => {
  try {
    console.log("[Test] Fetching ads for multiple pages...");

    const result = await fetchPageAds(
      [
        "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=IN&q=linkedin&search_type=keyword_unordered&media_type=all",
        "https://www.facebook.com/ZapierApp",
      ],
      {
        count: 100,
        activeStatus: "all",
        countryCode: "ALL",
      },
    );

    console.log(
      `[Test] Successfully fetched ${result.count} ads from multiple pages`,
    );
    return result;
  } catch (error) {
    console.error("[Test] Error:", error);
    throw error;
  }
};

/**
 * Extract pageId and pageName from scraping results
 * @param {Array} scrapingResults - Array of scraping result objects
 * @returns {Object} - Object with pageId and pageName, or null if not found
 */
const extractPageInfo = (scrapingResults) => {
  if (!Array.isArray(scrapingResults) || scrapingResults.length === 0) {
    return null;
  }

  // Find the first result that has page information
  for (const result of scrapingResults) {
    // Check for page_id or pageId in various possible locations
    const pageId = result.page_id || result.pageId || result.page?.id || null;
    // Check for page_name or pageName in various possible locations
    const pageName =
      result.page_name || result.pageName || result.page?.name || null;

    if (pageId || pageName) {
      return {
        pageId: pageId || null,
        pageName: pageName || null,
      };
    }
  }

  return null;
};

/**
 * Map Apify result to ScrapedAdDetail schema format
 * @param {Object} apifyResult - Single ad result from Apify
 * @returns {Object} - Mapped object matching ScrapedAdDetail schema
 */
const mapApifyResultToAdDetail = (apifyResult) => {
  return {
    entity_type: apifyResult.entity_type || null,
    is_active: apifyResult.is_active || null,
    publisher_platform: apifyResult.publisher_platform || [],
    page_name: apifyResult.page_name || apifyResult.pageName || null,
    collation_count: apifyResult.collation_count || null,
    collation_id: apifyResult.collation_id || null,
    snapshot: {
      body: apifyResult.snapshot?.body || null,
      branded_content: apifyResult.snapshot?.branded_content || null,
      caption: apifyResult.snapshot?.caption || null,
      cards: apifyResult.snapshot?.cards || [],
      cta_text: apifyResult.snapshot?.cta_text || null,
      cta_type: apifyResult.snapshot?.cta_type || null,
      display_format: apifyResult.snapshot?.display_format || null,
      images: apifyResult.snapshot?.images || [],
      is_reshared: apifyResult.snapshot?.is_reshared || null,
      link_description: apifyResult.snapshot?.link_description || null,
      link_url: apifyResult.snapshot?.link_url || null,
      title: apifyResult.snapshot?.title || null,
      videos: apifyResult.snapshot?.videos || [],
      additional_info: apifyResult.snapshot?.additional_info || null,
      extra_images: apifyResult.snapshot?.extra_images || [],
    },
    start_date_formatted:
      apifyResult.start_date_formatted || apifyResult.start_date || null,
    end_date_formatted:
      apifyResult.end_date_formatted || apifyResult.end_date || null,
  };
};

/**
 * Find or create ScrapingBrand by pageUrl
 * @param {string} pageUrl - The page URL
 * @returns {Promise<Object>} - ScrapingBrand document
 */
const findOrCreateScrapingBrand = async (pageUrl) => {
  let scrapingBrand = await ScrapedBrand.findOne({ pageUrl });

  if (scrapingBrand) {
    console.log(
      `[Save] Found existing ScrapingBrand with ID: ${scrapingBrand._id}`,
    );
    return scrapingBrand;
  }

  // Create new ScrapingBrand with just pageUrl
  scrapingBrand = new ScrapedBrand({
    pageUrl: pageUrl,
  });
  await scrapingBrand.save();
  console.log(`[Save] Created new ScrapingBrand with ID: ${scrapingBrand._id}`);
  return scrapingBrand;
};

/**
 * Update ScrapingBrand with pageId and pageName from scraping results
 * @param {Object} scrapingBrand - ScrapingBrand document
 * @param {Object} pageInfo - Object with pageId and pageName
 * @returns {Promise<Object>} - Updated ScrapingBrand
 */
const updateScrapingBrandInfo = async (scrapingBrand, pageInfo) => {
  if (!pageInfo) {
    return scrapingBrand;
  }

  let updated = false;
  if (pageInfo.pageId && !scrapingBrand.pageId) {
    scrapingBrand.pageId = pageInfo.pageId;
    updated = true;
  }
  if (pageInfo.pageName && !scrapingBrand.pageName) {
    scrapingBrand.pageName = pageInfo.pageName;
    updated = true;
  }

  if (updated) {
    await scrapingBrand.save();
    console.log(
      `[Save] Updated ScrapingBrand with pageId: ${pageInfo.pageId}, pageName: ${pageInfo.pageName}`,
    );
  }

  return scrapingBrand;
};

/**
 * Save a single ad detail to database
 * @param {Object} result - Single ad result from Apify
 * @param {Object} scrapingBrandId - ScrapingBrand ID
 * @returns {Promise<boolean>} - True if saved successfully
 */
const saveSingleAdDetail = async (result, scrapingBrandId) => {
  // Run raw Apify output through the strategy's parseOutput normalizer
  const strategy = getActiveStrategy();
  const normalizedResult = strategy.parseOutput(result);

  const adDetailData = mapApifyResultToAdDetail(normalizedResult);
  adDetailData.scrapingBrandId = scrapingBrandId;

  const adDetail = new ScrapedAdDetail(adDetailData);
  await adDetail.save();
  return true;
};

/**
 * Save scraping results to database
 * Creates or updates ScrapingBrand and saves all ad details
 * @param {string} pageUrl - The page URL that was scraped
 * @param {Array} scrapingResults - Array of ad results from Apify
 * @returns {Promise<Object>} - Object with saved brand info and ad counts
 */
export const saveScrapingResults = async (pageUrl, scrapingResults) => {
  try {
    if (!pageUrl) {
      throw new Error("Page URL is required");
    }

    // Filter out error objects from Apify (e.g. { error: "Ads not found" })
    let validResults = [];
    if (Array.isArray(scrapingResults)) {
      validResults = scrapingResults.filter((item) => !item.error);
    }

    const hasResults = validResults.length > 0;
    if (!hasResults) {
      console.log("[Save] No valid scraping results to save");
      return {
        scrapingBrand: null,
        adsSaved: 0,
        adsSkipped: 0,
        errors: [],
      };
    }

    // Use validResults instead of the raw scrapingResults moving forward
    scrapingResults = validResults;

    console.log(
      `[Save] Processing ${scrapingResults.length} valid results for page: ${pageUrl}`,
    );

    // Extract pageId and pageName from scraping results first
    const pageInfo = extractPageInfo(scrapingResults);

    let scrapingBrand = null;

    // If we found a pageId in the scraped ads, check if a brand with this pageId already exists
    if (pageInfo && pageInfo.pageId) {
      scrapingBrand = await ScrapedBrand.findOne({ pageId: pageInfo.pageId });
    }

    // If no brand exists by pageId, fall back to the URL
    if (!scrapingBrand) {
      scrapingBrand = await findOrCreateScrapingBrand(pageUrl);
    } else {
      console.log(
        `[Save] Found existing ScrapingBrand by pageId: ${scrapingBrand._id}`,
      );
      // We intentionally do NOT update pageUrl here to prevent E11000 dup key errors
      // caused by orphaned documents from previous failed runs.
    }

    // Apply any missing pageInfo fields to the brand
    await updateScrapingBrandInfo(scrapingBrand, pageInfo);

    // Save each ad detail
    let adsSaved = 0;
    let adsSkipped = 0;
    const errors = [];

    // Enforce a hard maximum of 100 ads saved to the database per scrape
    const resultsToSave = scrapingResults.slice(0, 100);

    for (const result of resultsToSave) {
      try {
        await saveSingleAdDetail(result, scrapingBrand._id);
        adsSaved++;
      } catch (error) {
        console.error(`[Save] Error saving ad detail:`, error.message);
        errors.push({
          result: result,
          error: error.message,
        });
        adsSkipped++;
      }
    }

    console.log(
      `[Save] Saved ${adsSaved} ads, skipped ${adsSkipped} ads for ScrapingBrand: ${scrapingBrand._id}`,
    );

    return {
      scrapingBrand: {
        _id: scrapingBrand._id,
        pageId: scrapingBrand.pageId,
        pageName: scrapingBrand.pageName,
        pageUrl: scrapingBrand.pageUrl,
      },
      adsSaved,
      adsSkipped,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("[Save] Error saving scraping results:", error);
    throw error;
  }
};

/**
 * Save scraping results to an existing ScrapingBrand (without creating/finding brand)
 * @param {string} scrapingBrandId - The existing ScrapingBrand ID
 * @param {Array} scrapingResults - Array of ad results from Apify
 * @returns {Promise<Object>} - Object with saved brand info and ad counts
 */
const saveScrapingResultsToExistingBrand = async (
  scrapingBrandId,
  scrapingResults,
) => {
  try {
    if (!scrapingBrandId) {
      throw new Error("ScrapingBrand ID is required");
    }

    // Verify the ScrapingBrand exists
    const scrapingBrand = await ScrapedBrand.findById(scrapingBrandId);
    if (!scrapingBrand) {
      throw new Error(`ScrapingBrand with ID ${scrapingBrandId} not found`);
    }

    const hasResults =
      Array.isArray(scrapingResults) && scrapingResults.length > 0;
    if (!hasResults) {
      console.log("[Save] No scraping results to save");
      return {
        scrapingBrand: {
          _id: scrapingBrand._id,
          pageId: scrapingBrand.pageId,
          pageName: scrapingBrand.pageName,
          pageUrl: scrapingBrand.pageUrl,
        },
        adsSaved: 0,
        adsSkipped: 0,
        errors: [],
      };
    }

    console.log(
      `[Save] Processing ${scrapingResults.length} results for existing ScrapingBrand: ${scrapingBrandId}`,
    );

    // Extract and update pageId and pageName from scraping results (if not already set)
    const pageInfo = extractPageInfo(scrapingResults);
    await updateScrapingBrandInfo(scrapingBrand, pageInfo);

    // Save each ad detail
    let adsSaved = 0;
    let adsSkipped = 0;
    const errors = [];

    // Enforce a hard maximum of 100 ads saved to the database per scrape
    const resultsToSave = scrapingResults.slice(0, 100);

    for (const result of resultsToSave) {
      try {
        await saveSingleAdDetail(result, scrapingBrandId);
        adsSaved++;
      } catch (error) {
        console.error(`[Save] Error saving ad detail:`, error.message);
        errors.push({
          result: result,
          error: error.message,
        });
        adsSkipped++;
      }
    }

    console.log(
      `[Save] Saved ${adsSaved} ads, skipped ${adsSkipped} ads for ScrapingBrand: ${scrapingBrandId}`,
    );

    return {
      scrapingBrand: {
        _id: scrapingBrand._id,
        pageId: scrapingBrand.pageId,
        pageName: scrapingBrand.pageName,
        pageUrl: scrapingBrand.pageUrl,
      },
      adsSaved,
      adsSkipped,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error(
      "[Save] Error saving scraping results to existing brand:",
      error,
    );
    throw error;
  }
};

/**
 * Refresh ad details for an existing ScrapingBrand
 * Deletes all existing ScrapedAdDetail records and fetches/saves new ones
 * @param {string} scrapingBrandId - The ScrapingBrand ID to refresh
 * @param {Object} options - Same options as fetchPageAds (count, countries, activeStatus, period)
 * @returns {Promise<Object>} - Combined fetch and save results
 */
export const refreshScrapingBrandAds = async (
  scrapingBrandId,
  options = {},
) => {
  try {
    if (!scrapingBrandId) {
      throw new Error("ScrapingBrand ID is required");
    }

    // Find the ScrapingBrand
    const scrapingBrand = await ScrapedBrand.findById(scrapingBrandId);
    if (!scrapingBrand) {
      throw new Error(`ScrapingBrand with ID ${scrapingBrandId} not found`);
    }

    // Use the highest precision identifier possible for the search
    let pageIdentifier;
    if (scrapingBrand.pageId && scrapingBrand.pageName) {
      // Perfect precision: Search by exact Page ID
      pageIdentifier = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=IN&view_all_page_id=${scrapingBrand.pageId}&search_type=page&q=${encodeURIComponent(scrapingBrand.pageName)}`;
    } else if (scrapingBrand.pageName) {
      // High precision: Search by the exact Brand Name
      pageIdentifier = scrapingBrand.pageName;
    } else {
      // Fallback: Use the URL they provided (often relying on username extraction)
      pageIdentifier = scrapingBrand.pageUrl;
    }

    // Fetch new ads FIRST before deleting old ones
    const fetchResult = await fetchPageAds(pageIdentifier, options);

    if (
      !fetchResult.success ||
      !fetchResult.ads ||
      fetchResult.ads.length === 0
    ) {
      console.log(
        `[Refresh] No ads fetched for ScrapingBrand: ${scrapingBrandId}`,
      );
      return {
        fetchResult,
        saveResult: {
          scrapingBrand: {
            _id: scrapingBrand._id,
            pageId: scrapingBrand.pageId,
            pageName: scrapingBrand.pageName,
            pageUrl: scrapingBrand.pageUrl,
          },
          adsSaved: 0,
          adsSkipped: 0,
          errors: [],
          deletedCount: 0,
        },
      };
    }

    // ── Atomic replace: delete old + insert new in a single transaction ──
    // This ensures a brand never shows 0 ads if the process crashes mid-operation
    console.log(
      `[Refresh] Starting transactional refresh for ScrapingBrand: ${scrapingBrandId} (${scrapingBrand.pageUrl})`,
    );

    const session = await mongoose.startSession();
    let adsSaved = 0;
    let deletedCount = 0;

    try {
      await session.withTransaction(async () => {
        // Step 1: Delete old ads (inside transaction)
        const deleteResult = await ScrapedAdDetail.deleteMany(
          { scrapingBrandId: scrapingBrandId },
          { session },
        );
        deletedCount = deleteResult.deletedCount;
        console.log(
          `[Refresh] Deleted ${deletedCount} existing ad details (in transaction)`,
        );

        // Step 2: Prepare and bulk-insert new ads (inside transaction)
        const strategy = getActiveStrategy();
        const adsToInsert = fetchResult.ads
          .filter((item) => !item.error)
          .slice(0, 100)
          .map((result) => {
            const normalized = strategy.parseOutput(result);
            const mapped = mapApifyResultToAdDetail(normalized);
            mapped.scrapingBrandId = scrapingBrandId;
            return mapped;
          });

        if (adsToInsert.length > 0) {
          await ScrapedAdDetail.insertMany(adsToInsert, { session });
          adsSaved = adsToInsert.length;
        }
      });
    } finally {
      await session.endSession();
    }

    // Update brand info (outside transaction — non-critical metadata)
    const pageInfo = extractPageInfo(fetchResult.ads);
    await updateScrapingBrandInfo(scrapingBrand, pageInfo);

    console.log(
      `[Refresh] Refresh completed for ScrapingBrand: ${scrapingBrandId}`,
    );
    console.log(`[Refresh] Deleted: ${deletedCount}, Saved: ${adsSaved}`);

    return {
      fetchResult,
      saveResult: {
        scrapingBrand: {
          _id: scrapingBrand._id,
          pageId: scrapingBrand.pageId,
          pageName: scrapingBrand.pageName,
          pageUrl: scrapingBrand.pageUrl,
        },
        adsSaved,
        adsSkipped: fetchResult.ads.length - adsSaved,
        deletedCount,
      },
    };
  } catch (error) {
    console.error("[Refresh] Error refreshing scraping brand ads:", error);
    throw error;
  }
};

/**
 * Fetch page ads and save to database in one call
 * @param {string|string[]} pageIdentifier - Facebook page URL, username, or page ID
 * @param {Object} options - Same options as fetchPageAds
 * @returns {Promise<Object>} - Combined fetch and save results
 */
export const fetchAndSavePageAds = async (pageIdentifier, options = {}) => {
  try {
    // Normalize pageUrl for saving
    const pageUrl =
      typeof pageIdentifier === "string" && pageIdentifier.startsWith("http")
        ? pageIdentifier
        : normalizePageUrl(pageIdentifier);

    // Fetch ads
    const fetchResult = await fetchPageAds(pageIdentifier, options);

    if (
      !fetchResult.success ||
      !fetchResult.ads ||
      fetchResult.ads.length === 0
    ) {
      return {
        fetchResult,
        saveResult: {
          scrapingBrand: null,
          adsSaved: 0,
          adsSkipped: 0,
          errors: [],
        },
      };
    }

    // Save to database
    const saveResult = await saveScrapingResults(pageUrl, fetchResult.ads);

    return {
      fetchResult,
      saveResult,
    };
  } catch (error) {
    console.error("[FetchAndSave] Error:", error);
    throw error;
  }
};
