const User = require('../../database/models/user.js');

async function findAllUsers() {
  return await User.find({});
}

async function getOrCreateUser(userId) {
  let user = await User.findOne({ userid: userId });
  if (!user) {
    user = await User.create({ userid: userId });
  }
  return user;
}

async function updateUserCoins(userId, newCoinAmount) {
  await getOrCreateUser(userId);
  return User.findOneAndUpdate(
    { userid: userId },
    { coins: newCoinAmount },
    { new: true },
  );
}

async function incrementUserCoins(userId, amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    throw new Error('Amount must be a valid number.');
  }
  await getOrCreateUser(userId);
  return User.findOneAndUpdate(
    { userid: userId },
    { $inc: { coins: amount } },
    { new: true },
  );
}

module.exports = {
  findAllUsers,
  getOrCreateUser,
  updateUserCoins,
  incrementUserCoins,
};
