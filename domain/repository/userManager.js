import User    from '../../database/models/user.js';

async function findAllUsers() {
  return await User.find({});
}

async function getOrCreateUser(userId) {
  let user = await User.findOne({ userid: userId });
  if (!user) {
    user = await User.create({ userid: userId, roll: 'admin', coins: 100 });
  }
  return user;
}

async function updateUserCoins(userId, newCoinAmount) {
  const user = await User.findOneAndUpdate(
    { userid: userId },
    { coins: newCoinAmount },
    { new: true }
  );
  return user;
}

export default {
  findAllUsers,
  getOrCreateUser,
  updateUserCoins,
};
