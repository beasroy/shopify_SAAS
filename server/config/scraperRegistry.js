export const SCRAPER_REGISTRY = {
  // ─── Current Actor ───────────────────────────────────────────
  "curious_coder/facebook-ads-library-scraper": {
    name: "Curious Coder FB Ads Scraper",

    /**
     * Build the Apify input payload for this actor.
     * @param {string[]} urls - Array of normalized Facebook Ad Library URLs
     * @param {Object} opts - Options like count, activeStatus, countries, countryCode
     * @returns {Object} - The input object to pass to actor.call()
     */
    buildInput: (urls, { count = 100 }) => ({
      urls: urls.map((u) => ({ url: u })),
      maxItems: count,
    }),

    /**
     * Normalize a single raw Apify output item into the format
     * that mapApifyResultToAdDetail() expects.
     * Return the item as-is if no transformation is needed.
     * @param {Object} rawItem - Single item from the Apify dataset
     * @returns {Object} - Normalized item
     */
    parseOutput: (rawItem) => rawItem, // Output already matches our schema
  },

  // ─── Legacy Actor (backup) ───────────────────────────────────
  paBd2Bv9ONUFkVddB: {
    name: "Legacy FB Ads Scraper",

    buildInput: (urls, { count = 100 }) => ({
      facebook_ad_library_search_url: urls[0],
      total_ads: count,
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ["RESIDENTIAL"],
      },
    }),

    parseOutput: (rawItem) => rawItem,
  },

  // ─── Example: Future Actor ───────────────────────────────────
  // 'some_other_actor/fb-scraper-v2': {
  //     name: 'Some Other FB Scraper',
  //     buildInput: (urls, { count }) => ({
  //         query: urls[0],
  //         limit: count
  //     }),
  //     parseOutput: (rawItem) => ({
  //         // Map their weird field names to our expected format
  //         page_id: rawItem.fbPageId,
  //         page_name: rawItem.fbPageName,
  //         is_active: rawItem.adIsActive,
  //         snapshot: {
  //             body: { text: rawItem.adText },
  //             images: rawItem.adImages || [],
  //             videos: rawItem.adVideos || [],
  //             display_format: rawItem.format
  //         },
  //         start_date_formatted: rawItem.startDate,
  //         end_date_formatted: rawItem.endDate
  //     })
  // }
};

/**
 * Get the active scraper strategy based on APIFY_ACTOR_ID in .env
 * Throws a clear, actionable error if the actor ID isn't registered.
 *
 * @returns {{ actorId: string, name: string, buildInput: Function, parseOutput: Function }}
 */
export const getActiveStrategy = () => {
  const actorId = process.env.APIFY_ACTOR_ID;

  if (!actorId) {
    throw new Error(
      "[ScraperRegistry] APIFY_ACTOR_ID is not set in .env. " +
        "Please set it to one of: " +
        Object.keys(SCRAPER_REGISTRY).join(", "),
    );
  }

  const strategy = SCRAPER_REGISTRY[actorId];

  if (!strategy) {
    const available = Object.entries(SCRAPER_REGISTRY)
      .map(([id, s]) => `  • ${id} (${s.name})`)
      .join("\n");

    throw new Error(
      `[ScraperRegistry] Unknown APIFY_ACTOR_ID: "${actorId}".\n` +
        `Registered actors:\n${available}\n\n` +
        `To fix: Either update APIFY_ACTOR_ID in .env to one of the above, ` +
        `or add a new entry to config/scraperRegistry.js for "${actorId}".`,
    );
  }

  // console.log(`[ScraperRegistry] Using strategy: ${strategy.name} (${actorId})`);
  return { actorId, ...strategy };
};
