import dotenv from 'dotenv';
import mongoose from 'mongoose';
import AdMetrics from '../models/AdMetrics.js';

dotenv.config();

/**
 * One-time helper to remove duplicate AdMetrics documents
 * that share the same (brandId, date).
 *
 * Keeps the most recently updated document per (brandId, date)
 * and deletes the rest.
 *
 * Run:
 *   node server/scripts/dedupeAdMetrics.js
 */
async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set');
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const duplicates = await AdMetrics.aggregate([
    {
      $group: {
        _id: { brandId: '$brandId', date: '$date' },
        ids: { $push: '$_id' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  console.log(`Found ${duplicates.length} duplicate (brandId, date) groups`);

  let deletedTotal = 0;

  for (const d of duplicates) {
    const docs = await AdMetrics.find(
      { _id: { $in: d.ids } },
      { _id: 1, updatedAt: 1, createdAt: 1 }
    ).sort({ updatedAt: -1, createdAt: -1 }).lean();

    const keep = docs[0]?._id;
    const toDelete = docs.slice(1).map(x => x._id);

    if (toDelete.length) {
      const res = await AdMetrics.deleteMany({ _id: { $in: toDelete } });
      deletedTotal += res.deletedCount || 0;
      console.log(
        `Kept ${String(keep)}; deleted ${res.deletedCount || 0} duplicates for brandId=${String(d._id.brandId)} date=${new Date(d._id.date).toISOString()}`
      );
    }
  }

  console.log(`Done. Deleted ${deletedTotal} duplicate AdMetrics docs.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Dedupe failed:', err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});

