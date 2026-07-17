import { Worker, Queue } from "bullmq";
import { fileURLToPath } from "url";
import path from "path";
import mongoose from "mongoose";
import { createRedisConnection } from "../config/redis.js";
import { connectDB, getConnectionStatus } from "../config/db.js";
import { refreshScrapingBrandAds } from "../services/scrapingService.js";
import ScrapedBrand from "../models/ScrapedBrand.js";
import dotenv from "dotenv";
dotenv.config();

const QUEUE_NAME = "brand-scraping";
const SCRAPING_INTERVAL_MS =
  parseInt(process.env.SCRAPING_INTERVAL_MS, 10) || 48 * 60 * 60 * 1000;

const redisConnection = createRedisConnection();

// Cross-platform direct-run detection (fixes Windows path mismatch)
const __filename = fileURLToPath(import.meta.url);

const ensureMongoConnection = async () => {
  const { isConnected, cachedConnection } = getConnectionStatus();
  if (!isConnected || !cachedConnection) {
    console.log("[ScrapingWorker] Establishing new MongoDB connection...");
    await connectDB();
  }
};

// ── BullMQ Queue (module-level, long-lived — reused by dispatcher) ──
const scrapingQueue = new Queue(QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: { age: 86_400, count: 50 },
    removeOnFail: { age: 604_800, count: 20 },
  },
});

export const scrapingWorker = new Worker(
  QUEUE_NAME,
  async (job) => {
    await ensureMongoConnection();

    // ── SCHEDULER JOB: Dispatch one job per brand ──
    if (job.name === "refresh-all-brands") {
      const brands = await ScrapedBrand.find({});
      console.log(`[ScrapingWorker] Found ${brands.length} brands to refresh`);

      if (brands.length === 0) return { brandsEnqueued: 0 };

      // Derive a stable interval number for deterministic job IDs
      const intervalNumber = Math.floor(job.timestamp / SCRAPING_INTERVAL_MS);

      // Enqueue all brand jobs in one atomic Redis round-trip
      // Deterministic jobId prevents duplicates if dispatcher retries
      await scrapingQueue.addBulk(
        brands.map((brand) => ({
          name: "refresh-single-brand",
          data: {
            brandId: brand._id.toString(),
            brandName: brand.pageName || brand.pageUrl,
          },
          opts: {
            jobId: `scrape-${brand._id}-${intervalNumber}`,
            attempts: 3,
            backoff: { type: "exponential", delay: 30_000 },
            removeOnComplete: { age: 86_400, count: 100 },
            removeOnFail: { age: 604_800, count: 50 },
          },
        })),
      );

      console.log(
        `[ScrapingWorker] Enqueued ${brands.length} brand jobs via addBulk (interval: ${intervalNumber})`,
      );
      return { brandsEnqueued: brands.length, intervalNumber };
    }

    // ── PER-BRAND JOB: Process a single brand ──
    if (job.name === "refresh-single-brand") {
      const { brandId, brandName } = job.data;
      console.log(
        `[ScrapingWorker] Refreshing ads for: ${brandName} (job: ${job.id})`,
      );

      const result = await refreshScrapingBrandAds(brandId);
      const adsSaved = result?.saveResult?.adsSaved ?? 0;

      console.log(
        `[ScrapingWorker] Refreshed ${brandName}: ${adsSaved} ads saved`,
      );

      return { brandId, adsSaved };
    }

    throw new Error(
      `[ScrapingWorker] Unknown job name: "${job.name}". Failing to prevent silent completion.`,
    );
  },
  {
    connection: redisConnection,
    concurrency: Number(process.env.SCRAPING_CONCURRENCY) || 1,
    limiter: {
      max: Number(process.env.SCRAPING_CONCURRENCY) || 1,
      duration: 10_000, // Launch up to X jobs every 10 seconds
    },
    // Lock settings are TOP-LEVEL Worker options (not inside settings{})
    lockDuration: 600_000, // 10 min (Apify calls are slow)
    lockRenewTime: 300_000, // Renew lock every 5 min
    stalledInterval: 120_000, // Check stalled every 2 min
    maxStalledCount: 2,
  },
);

scrapingWorker.on("active", (job) => {
  console.log(`[ScrapingWorker] Job started: ${job.name} (${job.id})`);
});

scrapingWorker.on("completed", (job, result) => {
  console.log(
    `[ScrapingWorker] Job completed: ${job.name} (${job.id})`,
    result,
  );
});

scrapingWorker.on("failed", (job, err) => {
  console.error(`[ScrapingWorker] Job failed: ${job?.name} (${job?.id})`, {
    error: err.message,
    attempt: job?.attemptsMade,
    brandId: job?.data?.brandId,
  });
});

scrapingWorker.on("error", (err) => {
  console.error("[ScrapingWorker] Worker error:", err.message);
});

export const scheduleScrapingJob = async () => {
  await scrapingQueue.upsertJobScheduler(
    "refresh-all-brands-scheduler",
    { every: SCRAPING_INTERVAL_MS },
    { name: "refresh-all-brands", data: {} },
  );

  console.log(
    `[ScrapingWorker] Interval scheduled: every ${SCRAPING_INTERVAL_MS} ms (${SCRAPING_INTERVAL_MS / 3600000}h)`,
  );
};

let isShuttingDown = false;
const shutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(
    `[ScrapingWorker] Received ${signal}, shutting down gracefully...`,
  );
  try {
    await scrapingWorker.close();
    await scrapingQueue.close();
    await redisConnection.quit();
    await mongoose.connection.close();
    console.log("[ScrapingWorker] All connections closed cleanly");
  } catch (err) {
    console.error("[ScrapingWorker] Error during shutdown:", err.message);
  }
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Automatically start the worker (PM2 handles process management)
(async () => {
  try {
    await ensureMongoConnection();
    await scheduleScrapingJob();
    console.log("[ScrapingWorker] Worker ready and listening for jobs");
  } catch (err) {
    console.error("[ScrapingWorker] Failed to start worker:", err.message);
    process.exit(1);
  }
})();
