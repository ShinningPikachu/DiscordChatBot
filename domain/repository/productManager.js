const Product = require('../../database/models/products.js');
const User = require('../../database/models/user.js');

async function addProductToUser(userId, { name, quantity }) {
  const user = await User.findOne({ userid: userId });
  if (!user) throw new Error('User not found');

  const existingProduct = await Product.findOne({ user: user._id, name });

  if (existingProduct) {
    existingProduct.quantity += quantity;
    return await existingProduct.save();
  }
  return await Product.create({ user: user._id, name, quantity });
}

async function removeProductFromUser(userId, { name, quantity }) {
  const user = await User.findOne({ userid: userId });
  if (!user) throw new Error('User not found');

  const product = await Product.findOne({ user: user._id, name });
  if (!product) throw new Error('Product not found');

  if (product.quantity <= quantity) {
    await Product.findByIdAndDelete(product._id);
    product.quantity = 0;
  } else {
    product.quantity -= quantity;
    await product.save();
  }

  return product;
}

async function getUserProducts(userId) {
  const user = await User.findOne({ userid: userId });
  if (!user) return [];
  return await Product.find({ user: user._id });
}

async function removeAllProduct(productId) {
  await Product.findByIdAndDelete(productId);
}

module.exports = {
  addProductToUser,
  removeProductFromUser,
  getUserProducts,
  removeAllProduct,
};
