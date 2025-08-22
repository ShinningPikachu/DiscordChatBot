import Product from '../../database/models/products.js';
import User    from '../../database/models/user.js';

async function addProductToUser(userId, { name, quantity, quality }) {
  const user = await User.findOne({ userid: userId });
  if (!user) throw new Error('User not found');

  const existingProduct = await Product.findOne({
    user: user._id,
    name,
    quality,
  });

  if (existingProduct) {
    existingProduct.quantity += quantity;
    return await existingProduct.save();
  } else {
    return await Product.create({
      user: user._id,
      name,
      quantity,
      quality,
    });
  }
}

async function removeProductFromUser(userId, { name, quantity, quality }) {
  const user = await User.findOne({ userid: userId });
  if (!user) throw new Error('User not found');

  const product = await Product.findOne({ user: user._id, name, quality });
  if (!product) throw new Error('Product not found');

  if (product.quantity <= quantity) {
    await findByIdAndDelete(product._id);
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

export default {
  addProductToUser,
  removeProductFromUser,
  getUserProducts,
  removeAllProduct,
};
