import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
    shopifyProductId: { type: String, unique: true },
    title: String,
    image: String,
    price: Number,
    createdAt: { type: Date, index: true }
  });
  
  const Product = mongoose.model('Product', ProductSchema);
  export default Product;