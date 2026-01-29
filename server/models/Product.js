import mongoose from "mongoose";

// const ProductSchema = new mongoose.Schema({
//   brandId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Brand',
//     required: true,
//     index: true
//   },
//   shopifyProductId: {
//     type: String,
//     required: true
//   },
//   title: { type: String, required: true },
//   handle: String,
//   descriptionHtml: String,
//   vendor: String,
//   productType: String,
//   tags: [String],
//   status: {
//     type: String,
//     enum: ['ACTIVE', 'ARCHIVED', 'DRAFT'],
//     default: 'ACTIVE'
//   },

//   images: [{
//     src: String,
//     altText: String,
//     position: Number
//   }],
//   featuredImage: String,

//   // Variants
//   variants: [{
//     shopifyVariantId: { type: String, required: true },
//     title: String,
//     price: Number,
//     compareAtPrice: Number,
//     sku: String,
//     barcode: String,
//     inventoryQuantity: Number,
//     weight: Number,
//     weightUnit: String,
//     position: Number
//   }],

//   price: Number,
//   compareAtPrice: Number,  // ADDED: For sale pricing

//   // Options (Size, Color, etc.)
//   // options: [{
//   //   name: String,
//   //   position: Number,
//   //   values: [String]
//   // }],

//   // SEO
//   seo: {
//     title: String,
//     description: String
//   },

//   // Publishing
//   publishedAt: Date,

//   // Shopify timestamps
//   shopifyCreatedAt: Date,
//   shopifyUpdatedAt: Date,

//   lastSyncedAt: { type: Date, default: Date.now }

// }, {
//   timestamps: true
// });

// ADDED: Compound unique index - product must be unique per brand

const ProductSchema = new mongoose.Schema({
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true,
    index: true
  },
  productId: {
    type: String,
    required: true
  },
  collectionIds: {
    type: [String],
    default: []
  },
  // collectionId: {
  //   type: String,
  //   required: true
  // },
  createdAt: { type: Date, index: true }
});

ProductSchema.index({ brandId: 1, productId: 1 }, { unique: true });

const Product = mongoose.model('Product', ProductSchema);
export default Product;

// ADDED: Index for common queries
// ProductSchema.index({ brandId: 1, status: 1 });
// ProductSchema.index({ brandId: 1, productType: 1 });
// ProductSchema.index({ handle: 1 });