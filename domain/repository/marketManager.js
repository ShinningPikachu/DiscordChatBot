const MarketListing = require('./models/MarketListing');
const Product = require('./models/Product');
const User = require('./models/User');

async function addListing(userId, productId, price) {
  const user = await User.findOne({ userid: userId });
  if (!user) throw new Error('User not found');

  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');

  return await MarketListing.create({
    product: product._id,
    seller: user._id,
    price,
  });
}

async function removeListing(listingId) {
  return await MarketListing.findByIdAndDelete(listingId);
}

async function getListings() {
  return await MarketListing.find().populate('product').populate('seller');
}

module.exports = {
  addListing,
  removeListing,
  getListings,
};
