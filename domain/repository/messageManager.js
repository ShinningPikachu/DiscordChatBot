const Message = require('./models/Message');
const User = require('./models/User');

async function sendMessage(senderId, receiverId, content) {
  const sender = await User.findOne({ userid: senderId });
  const receiver = await User.findOne({ userid: receiverId });
  if (!sender || !receiver) throw new Error('Sender or receiver not found');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await Message.findOne({
    sender: sender._id,
    receiver: receiver._id,
    date: today,
  });

  if (existing) throw new Error('Message already sent today');

  return await Message.create({
    sender: sender._id,
    receiver: receiver._id,
    content,
    date: today,
  });
}

async function getMessagesBetween(senderId, receiverId) {
  const sender = await User.findOne({ userid: senderId });
  const receiver = await User.findOne({ userid: receiverId });
  if (!sender || !receiver) throw new Error('Sender or receiver not found');

  return await Message.find({ sender: sender._id, receiver: receiver._id });
}

module.exports = {
  sendMessage,
  getMessagesBetween,
};
