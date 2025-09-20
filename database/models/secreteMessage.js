const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, maxlength: 500 },
  date: { type: Date, default: () => new Date().setHours(0, 0, 0, 0) }
});

messageSchema.index({ sender: 1, receiver: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Message', messageSchema);
